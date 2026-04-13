from rest_framework.throttling import SimpleRateThrottle


class AIRateThrottle(SimpleRateThrottle):
    """30 requests/minute per authenticated user for AI proxy endpoints."""
    scope = 'ai'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return self.cache_format % {
                'scope': self.scope,
                'ident': request.user.pk,
            }
        return self.get_ident(request)


class AuthRateThrottle(SimpleRateThrottle):
    """10 requests/minute per IP for login endpoints."""
    scope = 'auth'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class RegisterRateThrottle(SimpleRateThrottle):
    """5 requests/minute per IP for registration."""
    scope = 'register'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }
