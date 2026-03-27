from rest_framework.permissions import BasePermission
from .models import User


class IsStudent(BasePermission):
    """Allow access only to users with the Student role."""
    message = "Access restricted to students."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class IsAdmin(BasePermission):
    """Allow access only to Admin role users."""
    message = "Access restricted to admins."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsCoachingCenterOwner(BasePermission):
    """Allow access only to Coaching Center Owner role users."""
    message = "Access restricted to coaching center owners."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.COACHING_CENTER_OWNER
        )


class IsUniversityAdmin(BasePermission):
    """Allow access only to University Admin role users."""
    message = "Access restricted to university admins."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.UNIVERSITY_ADMIN
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Admin users get full access.
    Authenticated users get read-only access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role == User.Role.ADMIN


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: allow access if the user owns the object or is Admin.
    The view must pass the user as the object.
    """
    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        # obj can be User instance or any model with a `user` FK
        if hasattr(obj, "user"):
            return obj.user == request.user
        return obj == request.user
