"""Apply the account's enrolled class to every student-facing curriculum query."""
from users.models import User


def curriculum_admin(user):
    return bool(user.is_authenticated and user.is_active and (
        user.is_superuser or user.role in ('admin', 'teacher')
        or user.is_staff and user.role != User.Role.STUDENT
    ))


def class_scope(queryset, user, field='subject__class_level'):
    if curriculum_admin(user):
        return queryset
    if not user.is_authenticated or user.role != User.Role.STUDENT or user.class_level not in User.ClassLevel.values:
        return queryset.none()
    return queryset.filter(**{field: user.class_level})
