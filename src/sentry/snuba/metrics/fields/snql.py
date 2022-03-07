from sentry.sentry_metrics.utils import resolve_weak

from snuba_sdk import Column, Condition, Entity, Function, Granularity, Limit, Offset, Op, Query


def _init_sessions(metric_id, alias=None):
    return Function(
        "sumMergeIf",
        [
            Column("value"),
            Function(
                "equals",
                [
                    Function(
                        "arrayElement",
                        [
                            Column("tags.value"),
                            Function(
                                "indexOf",
                                [Column("tags.key"), resolve_weak("session.status")],
                            ),
                        ],
                        "status",
                    ),
                    resolve_weak("init"),
                ],
            ),
        ],
        alias or "init_sessions",
    )


def _crashed_sessions(metric_id, alias=None):
    return Function(
        "sumMergeIf",
        [
            Column("value"),
            Function(
                "equals",
                [
                    Function(
                        "arrayElement",
                        [
                            Column("tags.value"),
                            Function(
                                "indexOf",
                                [Column("tags.key"), resolve_weak("session.status")],
                            ),
                        ],
                        "status",
                    ),
                    resolve_weak("crashed"),
                ],
            ),
        ],
        alias or "crashed_sessions",
    )


def _errored_preaggr_sessions(metric_ids, alias=None):
    return Function(
        "sumMergeIf",
        [
            Column("value"),
            Function(
                "and",
                [
                    Function(
                        "equals",
                        [
                            Function(
                                "arrayElement",
                                [
                                    Column("tags.value"),
                                    Function(
                                        "indexOf",
                                        [Column("tags.key"), resolve_weak("session.status")],
                                    ),
                                ],
                                "status",
                            ),
                            resolve_weak("errored_preaggr"),
                        ],
                    ),
                    Function("in", [Column("metric_id"), list(metric_ids)]),
                ],
            ),
        ],
        alias or "errored_preaggr",
    )


def _sessions_errored_set(metric_ids, alias=None):
    return Function(
        "uniqCombined64MergeIf",
        [
            Column("value"),
            Function(
                "in",
                [
                    Column("metric_id"),
                    list(metric_ids),
                ],
            ),
        ],
        alias or "sessions_errored_set",
    )


def _percentage_in_snql(arg1_snql, arg2_snql, entity, metric_ids, alias=None):
    # ToDo check this !
    return Function(
        "multiply",
        [
            100,
            Function("minus", [1, Function("divide", [arg1_snql, arg2_snql])]),
        ],
        alias or "percentage",
    )


