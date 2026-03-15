from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser
from .models import University
from .serializers import UniversitySerializer


class UniversityListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/universities/       - list all (public)
    POST /api/universities/       - create (admin only)
    Supports: ?search=name&city=Dhaka&ordering=name
    """
    queryset = University.objects.all()
    serializer_class = UniversitySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'city', 'country']
    ordering_fields = ['name', 'established_year', 'created_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]


class UniversityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/universities/<id>/  - retrieve (public)
    PUT    /api/universities/<id>/  - update (admin only)
    PATCH  /api/universities/<id>/  - partial update (admin only)
    DELETE /api/universities/<id>/  - delete (admin only)
    """
    queryset = University.objects.all()
    serializer_class = UniversitySerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]
