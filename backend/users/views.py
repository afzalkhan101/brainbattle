from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Wallet
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
    WalletSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access":  str(refresh.access_token),
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """
    POST /api/users/register/
    Public registration for Student, Coaching Center Owner, University Admin.
    Returns full profile + JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "user":   UserProfileSerializer(user, context={"request": request}).data,
                "tokens": _get_tokens(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/users/login/
    Returns full profile + JWT tokens on success.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(
            {
                "user":   UserProfileSerializer(user, context={"request": request}).data,
                "tokens": _get_tokens(user),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/users/logout/
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """
    GET /api/users/profile/
    Returns the authenticated user's full profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class ProfileUpdateView(APIView):
    """
    PATCH /api/users/profile/update/
    Update: first_name, last_name, phone, profile_image, class_level, institution.
    Returns updated full profile.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserProfileSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


# ── Password ──────────────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/users/change-password/
    Change password for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletView(APIView):
    """
    GET /api/users/wallet/
    Returns wallet balance and last 20 transactions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        # Limit transactions to last 20 for performance
        wallet_data = WalletSerializer(wallet).data
        wallet_data["transactions"] = wallet_data["transactions"][:20]
        return Response(wallet_data)
