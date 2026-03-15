from django.db import models


class University(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=200)
    country = models.CharField(max_length=100, default='Bangladesh')
    website = models.URLField(blank=True, null=True)
    established_year = models.PositiveIntegerField(blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Universities'

    def __str__(self):
        return self.name
