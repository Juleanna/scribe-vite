from django.contrib import admin

from .models import Project, Step


class StepInline(admin.TabularInline):
    model = Step
    extra = 0
    fields = ['order', 'media_type', 'media_file', 'title', 'description']
    ordering = ['order']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'annotation_style', 'created_at', 'updated_at']
    list_filter = ['annotation_style', 'created_at']
    search_fields = ['title', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [StepInline]


@admin.register(Step)
class StepAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'order', 'media_type', 'created_at']
    list_filter = ['media_type', 'created_at']
    search_fields = ['title', 'project__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
