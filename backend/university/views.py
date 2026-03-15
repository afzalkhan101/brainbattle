from rest_framework import generics
from .models import University
from .serializers import UniversitySerializer

class UniversityListAPIView(generics.ListAPIView):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer