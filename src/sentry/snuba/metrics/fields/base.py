__all__ = (
    'metric_object_factory',
    'run_metrics_query',
    'get_single_metric_info',
    'DerivedMetricBaseTraverser',
    'SingularEntityTraverser',
    'RawMetric',
    'MetricsFieldBase',
    'RawMetric',
    'DerivedMetric',
    'SingularEntityDerivedMetric',
    'DERIVED_METRICS'
)

from operator import itemgetter
from datetime import datetime, timedelta
from abc import ABC
from functools import cached_property


from typing import (
    Any,
    List,
    Mapping,
    Optional,
    Sequence,
)

from snuba_sdk.orderby import OrderBy
from snuba_sdk import Column, Condition, Entity, Function, Granularity, Op, Query

from sentry.api.utils import InvalidParams
from sentry.models import Project
from sentry.sentry_metrics import indexer
from sentry.sentry_metrics.utils import (
    resolve_weak,
    reverse_resolve,
)
from sentry.snuba.dataset import Dataset, EntityKey
from sentry.utils.snuba import raw_snql_query
from sentry.snuba.metrics.fields.snql import (
    _init_sessions,
    _crashed_sessions,
    _percentage_in_snql,
    _errored_preaggr_sessions,
    _sessions_errored_set,
)
from sentry.snuba.metrics.utils import (
    METRIC_TYPE_TO_ENTITY,
    TS_COL_QUERY,
    AVAILABLE_OPERATIONS,
    MetricMetaWithTagKeys,
    GRANULARITY,
    OPERATIONS_TO_ENTITY,
    OP_TO_SNUBA_FUNCTION,
    DerivedMetricParseException,
)


def metric_object_factory(op, metric_name):
    """Returns an appropriate instance of MetricFieldBase object"""
    if metric_name in DERIVED_METRICS:
        instance = DERIVED_METRICS[metric_name]
    else:
        instance = RawMetric(op, metric_name)
    return instance


def run_metrics_query(
    *,
    entity_key: EntityKey,
    select: List[Column],
    where: List[Condition],
    groupby: List[Column],
    projects,
    org_id,
    referrer: str,
) -> Mapping[str, Any]:
    # Round timestamp to minute to get cache efficiency:
    now = datetime.now().replace(second=0, microsecond=0)

    query = Query(
        dataset=Dataset.Metrics.value,
        match=Entity(entity_key.value),
        select=select,
        groupby=groupby,
        where=[
            Condition(Column("org_id"), Op.EQ, org_id),
            Condition(Column("project_id"), Op.IN, [p.id for p in projects]),
            Condition(Column(TS_COL_QUERY), Op.GTE, now - timedelta(hours=24)),
            Condition(Column(TS_COL_QUERY), Op.LT, now),
        ]
        + where,
        granularity=Granularity(GRANULARITY),
    )
    result = raw_snql_query(query, referrer, use_cache=True)
    return result["data"]


def get_single_metric_info(projects: Sequence[Project], metric_name: str) -> MetricMetaWithTagKeys:
    assert projects

    metric_id = indexer.resolve(metric_name)

    if metric_id is None:
        raise InvalidParams

    for metric_type in ("counter", "set", "distribution"):
        # TODO: What if metric_id exists for multiple types / units?
        entity_key = METRIC_TYPE_TO_ENTITY[metric_type]
        data = run_metrics_query(
            entity_key=entity_key,
            select=[Column("metric_id"), Column("tags.key")],
            where=[Condition(Column("metric_id"), Op.EQ, metric_id)],
            groupby=[Column("metric_id"), Column("tags.key")],
            referrer="snuba.metrics.meta.get_single_metric",
            projects=projects,
            org_id=projects[0].organization_id,
        )
        if data:
            tag_ids = {tag_id for row in data for tag_id in row["tags.key"]}
            return {
                "name": metric_name,
                "type": metric_type,
                "operations": AVAILABLE_OPERATIONS[entity_key.value],
                "tags": sorted(
                    ({"key": reverse_resolve(tag_id)} for tag_id in tag_ids),
                    key=itemgetter("key"),
                ),
                "unit": None,
            }

    raise InvalidParams


class DerivedMetricBaseTraverser:
    @staticmethod
    def get_entity_of_derived_metric(derived_metric_name, projects):
        raise NotImplementedError()

    @staticmethod
    def gen_select_snql(derived_metric_name, entity):
        raise NotImplementedError()

    @staticmethod
    def gen_metric_ids(derived_metric_name):
        raise NotImplementedError()

    @staticmethod
    def validate_derived_metric_dependency_tree(derived_metric_name):
        raise NotImplementedError()

    @staticmethod
    def generate_bottom_up_derived_metrics_dependencies(derived_metric_name):
        import queue

        derived_metric = DERIVED_METRICS[derived_metric_name]
        results = []
        queue = queue.Queue()
        queue.put(derived_metric)
        while not queue.empty():
            node = queue.get()
            if node.metric_name in DERIVED_METRICS:
                results.append(node.metric_name)
            for metric in node.metrics:
                if metric in DERIVED_METRICS:
                    queue.put(DERIVED_METRICS[metric])
        return list(reversed(results))


class SingularEntityTraverser(DerivedMetricBaseTraverser):
    @staticmethod
    def get_entity_of_derived_metric(derived_metric_name, projects):
        if derived_metric_name not in DERIVED_METRICS:
            metric_type = get_single_metric_info(projects, derived_metric_name)["type"]
            return METRIC_TYPE_TO_ENTITY[metric_type].value
        derived_metric = DERIVED_METRICS[derived_metric_name]
        for metric in derived_metric.metrics:
            return SingularEntityTraverser.get_entity_of_derived_metric(metric, projects)

    @classmethod
    def gen_select_snql(cls, derived_metric_name, entity):
        if derived_metric_name not in DERIVED_METRICS:
            return []
        derived_metric = DERIVED_METRICS[derived_metric_name]
        arg_snql = []
        for arg in derived_metric.metrics:
            arg_snql += cls.gen_select_snql(arg, entity)
        return [
            derived_metric.snql(
                *arg_snql,
                metric_ids=SingularEntityTraverser.gen_metric_ids(derived_metric_name),
                entity=entity,
            )
        ]

    @staticmethod
    def gen_metric_ids(derived_metric_name):
        if derived_metric_name not in DERIVED_METRICS:
            return set()
        derived_metric = DERIVED_METRICS[derived_metric_name]
        ids = set()
        for metric_name in derived_metric.metrics:
            if metric_name not in DERIVED_METRICS:
                ids.add(resolve_weak(metric_name))
            else:
                ids |= SingularEntityTraverser.gen_metric_ids(metric_name)
        return ids

    @staticmethod
    def validate_derived_metric_dependency_tree(derived_metric_name, projects):
        entities = SingularEntityTraverser.__get_all_entities_in_derived_metric_dependency_tree(
            derived_metric_name=derived_metric_name, projects=projects
        )
        return len(entities) == 1 and entities.pop() is not None

    @staticmethod
    def __get_all_entities_in_derived_metric_dependency_tree(derived_metric_name, projects):
        if derived_metric_name not in DERIVED_METRICS:
            return set()
        derived_metric = DERIVED_METRICS[derived_metric_name]
        entities = {derived_metric.get_entity(projects)}
        for metric_name in derived_metric.metrics:
            entities |= (
                SingularEntityTraverser.__get_all_entities_in_derived_metric_dependency_tree(
                    metric_name, projects
                )
            )
        return entities


class MetricsFieldBase(ABC):
    def __init__(self, op, metric_name):
        self.op = op
        self.metric_name = metric_name

    def get_entity(self, **kwargs):
        raise NotImplementedError

    def generate_metric_ids(self, *args):
        raise NotImplementedError

    def generate_select_statements(self, **kwargs):
        raise NotImplementedError

    def generate_orderby_clause(self, **kwargs):
        raise NotImplementedError


class RawMetric(MetricsFieldBase):
    def get_entity(self, **kwargs):
        return OPERATIONS_TO_ENTITY[self.op]

    def generate_metric_ids(self, entity, *args):
        return (
            {resolve_weak(self.metric_name)} if OPERATIONS_TO_ENTITY[self.op] == entity else set()
        )

    def _build_conditional_aggregate_for_metric(self, entity):
        snuba_function = OP_TO_SNUBA_FUNCTION[entity][self.op]
        return Function(
            snuba_function,
            [
                Column("value"),
                Function("equals", [Column("metric_id"), resolve_weak(self.metric_name)]),
            ],
            alias=f"{self.op}({self.metric_name})",
        )

    def generate_select_statements(self, entity, **kwargs):
        return [self._build_conditional_aggregate_for_metric(entity=entity)]

    def generate_orderby_clause(self, entity, direction, **kwargs):
        return [
            OrderBy(
                self.generate_select_statements(entity=entity)[0],
                direction,
            )
        ]

    entity = cached_property(get_entity)


class DerivedMetric(MetricsFieldBase, ABC):
    traverser_cls = None

    def __init__(
        self,
        metric_name: str,
        metrics: List[str],
        unit: str,
        result_type: Optional[str] = None,
        snql: Optional[Function] = None,
        compute_func: Any = lambda *args: args,
        is_private: bool = False,
    ):
        super().__init__(op=None, metric_name=metric_name)
        self.metrics = metrics
        self.snql = snql
        self.result_type = result_type
        self.compute_func = compute_func
        self.unit = unit
        self._entity = None

    def get_entity(self, projects=None, **kwargs):
        return (
            self.traverser_cls.get_entity_of_derived_metric(self.metric_name, projects)
            if projects
            else self._entity
        )

    def generate_select_statements(self, projects, **kwargs):
        if not self.traverser_cls.validate_derived_metric_dependency_tree(
            derived_metric_name=self.metric_name, projects=projects
        ):
            raise DerivedMetricParseException(
                f"Derived Metric {self.metric_name} cannot be calculated from a single entity"
            )
        return self.traverser_cls.gen_select_snql(
            derived_metric_name=self.metric_name, entity=self.entity
        )

    def generate_metric_ids(self, *args):
        return self.traverser_cls.gen_metric_ids(derived_metric_name=self.metric_name)

    def generate_metrics_dependency_tree(self):
        return self.traverser_cls.generate_bottom_up_derived_metrics_dependencies(
            derived_metric_name=self.metric_name
        )

    def generate_orderby_clause(self, projects, direction):
        return [
            OrderBy(
                self.generate_select_statements(projects=projects)[0],
                direction,
            )
        ]

    entity = cached_property(get_entity)


class SingularEntityDerivedMetric(DerivedMetric):
    traverser_cls = SingularEntityTraverser

    def __init__(
        self,
        metric_name: str,
        metrics: List[str],
        unit: str,
        snql: Function,
        is_private: bool = False,
    ):
        super().__init__(
            metric_name=metric_name,
            metrics=metrics,
            unit=unit,
            result_type="numeric",
            snql=snql,
            compute_func=lambda *args: args,
            is_private=is_private,
        )

    def get_entity(self, projects=None, **kwargs):
        entity = super().get_entity(projects)
        if not entity:
            raise DerivedMetricParseException(
                "entity property is only available after it is set through calling `get_entity` "
                "with projects"
            )
        return entity


DERIVED_METRICS = {
    derived_metric.metric_name: derived_metric
    for derived_metric in [
        SingularEntityDerivedMetric(
            metric_name="init_sessions",
            metrics=["sentry.sessions.session"],
            unit="sessions",
            snql=lambda *_, entity, metric_ids, alias=None: _init_sessions(metric_ids, alias),
        ),
        SingularEntityDerivedMetric(
            metric_name="crashed_sessions",
            metrics=["sentry.sessions.session"],
            unit="sessions",
            snql=lambda *_, entity, metric_ids, alias=None: _crashed_sessions(
                metric_ids, alias=alias
            ),
        ),
        SingularEntityDerivedMetric(
            metric_name="crash_free_percentage",
            metrics=["crashed_sessions", "init_sessions"],
            unit="percentage",
            snql=lambda *args, entity, metric_ids, alias=None: _percentage_in_snql(
                *args, entity, metric_ids, alias="crash_free_percentage"
            ),
        ),
        SingularEntityDerivedMetric(
            metric_name="errored_preaggr",
            metrics=["sentry.sessions.session"],
            unit="sessions",
            snql=lambda *_, entity, metric_ids, alias=None: _errored_preaggr_sessions(
                metric_ids, alias=alias
            ),
        ),
        SingularEntityDerivedMetric(
            metric_name="sessions_errored_set",
            metrics=["sentry.sessions.session.error"],
            unit="sessions",
            snql=lambda *_, entity, metric_ids, alias=None: _sessions_errored_set(
                metric_ids, alias=alias
            ),
        ),
    ]
}
