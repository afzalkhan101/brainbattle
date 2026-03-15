from django.contrib import admin
from .models import University


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'is_public', 'established_year')
    list_filter = ('is_public', 'country')
    search_fields = ('name', 'city')
    ordering = ('name',)
