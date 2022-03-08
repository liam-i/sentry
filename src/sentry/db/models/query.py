from __future__ import annotations

from functools import reduce
from typing import Any, Mapping, cast

from django.db import router, transaction
from django.db.models import Model, Q
from django.db.models.expressions import CombinedExpression
from django.db.models.signals import post_save

from .utils import resolve_combined_expression

__all__ = (
    "create",
    "update",
)


def handle_combined_expression(instance: Model, **kwargs: Any) -> Mapping[str, Any]:
    return {key: _handle_combined_expression(instance, value) for key, value in kwargs.items()}


def _handle_combined_expression(instance: Model, value: Any) -> Any:
    if isinstance(value, CombinedExpression):
        return resolve_combined_expression(instance, value)
    return value


def update(instance: Model, using: str | None = None, **kwargs: Any) -> int:
    """
    Updates specified attributes on the current instance.
    """
    assert instance.pk, "Cannot update an instance that has not yet been created."

    using = using or router.db_for_write(instance.__class__, instance=instance)

    for field in instance._meta.fields:
        if getattr(field, "auto_now", False) and field.name not in kwargs:
            kwargs[field.name] = field.pre_save(instance, False)

    affected = cast(
        int, instance.__class__._base_manager.using(using).filter(pk=instance.pk).update(**kwargs)
    )

    for k, v in handle_combined_expression(instance, **kwargs).items():
        setattr(instance, k, v)

    if affected == 1:
        post_save.send(sender=instance.__class__, instance=instance, created=False)
        return affected
    elif affected == 0:
        return affected
    elif affected < 0:
        raise ValueError(
            "Somehow we have updated a negative number of rows. You seem to have a problem with your db backend."
        )
    else:
        raise ValueError("Somehow we have updated multiple rows. This is very, very bad.")


update.alters_data = True  # type: ignore


def create(model: Model, using: str | None = None, **kwargs: Any) -> Model:
    if not using:
        using = router.db_for_write(model)

    objects = model.objects.using(using)

    create_kwargs = kwargs.copy()
    instance = objects.model()
    for k, v in handle_combined_expression(instance, **kwargs).items():
        # XXX(dcramer): we want to support column shortcut on create so
        # we can do create_or_update(..., {'project': 1})
        if not isinstance(v, Model):
            k = model._meta.get_field(k).attname

        create_kwargs[k] = v

    with transaction.atomic(using=using):
        return objects.create(**create_kwargs)


def in_iexact(column: str, values: Any) -> Q:
    """Operator to test if any of the given values are (case-insensitive)
    matching to values in the given column."""
    from operator import or_

    query = f"{column}__iexact"

    return reduce(or_, [Q(**{query: v}) for v in values])


def in_icontains(column: str, values: Any) -> Q:
    """Operator to test if any of the given values are (case-insensitively)
    contained within values in the given column."""
    from operator import or_

    query = f"{column}__icontains"

    return reduce(or_, [Q(**{query: v}) for v in values])
