from typing import Type, Any, Dict, Callable, Optional, TypeVar, Generic
from enum import Enum
import inspect
from functools import wraps

T = TypeVar('T')


class ServiceLifetime(Enum):
    SINGLETON = "singleton"
    TRANSIENT = "transient"
    SCOPED = "scoped"


class ServiceDescriptor:
    def __init__(
        self,
        service_type: Type,
        implementation: Type,
        lifetime: ServiceLifetime,
        factory: Optional[Callable] = None
    ):
        self.service_type = service_type
        self.implementation = implementation
        self.lifetime = lifetime
        self.factory = factory


class DIContainer:
    """Dependency Injection Container"""
    
    def __init__(self):
        self._services: Dict[Type, ServiceDescriptor] = {}
        self._singletons: Dict[Type, Any] = {}
        self._scoped_instances: Dict[Type, Any] = {}
        self._building_stack: set = set()
    
    def register_singleton(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainer':
        """Register a singleton service"""
        if implementation is None and factory is None:
            implementation = service_type
        
        self._services[service_type] = ServiceDescriptor(
            service_type=service_type,
            implementation=implementation,
            lifetime=ServiceLifetime.SINGLETON,
            factory=factory
        )
        return self
    
    def register_transient(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainer':
        """Register a transient service"""
        if implementation is None and factory is None:
            implementation = service_type
        
        self._services[service_type] = ServiceDescriptor(
            service_type=service_type,
            implementation=implementation,
            lifetime=ServiceLifetime.TRANSIENT,
            factory=factory
        )
        return self
    
    def register_scoped(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainer':
        """Register a scoped service"""
        if implementation is None and factory is None:
            implementation = service_type
        
        self._services[service_type] = ServiceDescriptor(
            service_type=service_type,
            implementation=implementation,
            lifetime=ServiceLifetime.SCOPED,
            factory=factory
        )
        return self
    
    def register_instance(self, service_type: Type[T], instance: T) -> 'DIContainer':
        """Register a specific instance as singleton"""
        self._singletons[service_type] = instance
        return self
    
    def resolve(self, service_type: Type[T]) -> T:
        """Resolve a service instance"""
        if service_type in self._building_stack:
            raise ValueError(f"Circular dependency detected for {service_type}")
        
        # Check if already registered
        if service_type not in self._services and service_type not in self._singletons:
            # Try to auto-register if it's a concrete class
            if inspect.isclass(service_type) and not inspect.isabstract(service_type):
                self.register_transient(service_type)
            else:
                raise ValueError(f"Service {service_type} is not registered")
        
        # Return existing singleton
        if service_type in self._singletons:
            return self._singletons[service_type]
        
        descriptor = self._services[service_type]
        
        # Handle singleton lifetime
        if descriptor.lifetime == ServiceLifetime.SINGLETON:
            if service_type in self._singletons:
                return self._singletons[service_type]
            
            instance = self._create_instance(descriptor)
            self._singletons[service_type] = instance
            return instance
        
        # Handle scoped lifetime
        elif descriptor.lifetime == ServiceLifetime.SCOPED:
            if service_type in self._scoped_instances:
                return self._scoped_instances[service_type]
            
            instance = self._create_instance(descriptor)
            self._scoped_instances[service_type] = instance
            return instance
        
        # Handle transient lifetime
        else:
            return self._create_instance(descriptor)
    
    def _create_instance(self, descriptor: ServiceDescriptor) -> Any:
        """Create an instance of the service"""
        self._building_stack.add(descriptor.service_type)
        
        try:
            if descriptor.factory:
                # Use factory function
                return descriptor.factory()
            
            # Use constructor injection
            constructor = descriptor.implementation.__init__
            sig = inspect.signature(constructor)
            
            # Prepare constructor arguments
            kwargs = {}
            for param_name, param in sig.parameters.items():
                if param_name == 'self':
                    continue
                
                param_type = param.annotation
                if param_type != inspect.Parameter.empty:
                    # Resolve dependency
                    kwargs[param_name] = self.resolve(param_type)
                elif param.default != inspect.Parameter.empty:
                    # Use default value
                    kwargs[param_name] = param.default
                else:
                    raise ValueError(f"Cannot resolve parameter {param_name} for {descriptor.implementation}")
            
            return descriptor.implementation(**kwargs)
        
        finally:
            self._building_stack.remove(descriptor.service_type)
    
    def clear_scoped(self) -> None:
        """Clear scoped instances"""
        self._scoped_instances.clear()
    
    def is_registered(self, service_type: Type) -> bool:
        """Check if a service is registered"""
        return service_type in self._services or service_type in self._singletons
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get information about registered services"""
        info = {
            'registered_services': len(self._services),
            'singleton_instances': len(self._singletons),
            'scoped_instances': len(self._scoped_instances),
            'services': {}
        }
        
        for service_type, descriptor in self._services.items():
            info['services'][service_type.__name__] = {
                'implementation': descriptor.implementation.__name__,
                'lifetime': descriptor.lifetime.value,
                'has_factory': descriptor.factory is not None
            }
        
        return info


class ServiceProvider:
    """Service provider with dependency injection"""
    
    def __init__(self, container: DIContainer):
        self._container = container
    
    def get_service(self, service_type: Type[T]) -> T:
        """Get a service instance"""
        return self._container.resolve(service_type)
    
    def get_required_service(self, service_type: Type[T]) -> T:
        """Get a required service (throws if not found)"""
        if not self._container.is_registered(service_type):
            raise ValueError(f"Required service {service_type} is not registered")
        return self._container.resolve(service_type)
    
    def get_service_or_none(self, service_type: Type[T]) -> Optional[T]:
        """Get a service instance or None if not registered"""
        try:
            return self._container.resolve(service_type)
        except ValueError:
            return None


def inject(service_type: Type[T]):
    """Decorator for method injection"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if hasattr(self, '_service_provider'):
                service = self._service_provider.get_service(service_type)
                return func(self, service, *args, **kwargs)
            else:
                raise ValueError("Service provider not available for injection")
        return wrapper
    return decorator


class DIContainerBuilder:
    """Builder for DI Container configuration"""
    
    def __init__(self):
        self._container = DIContainer()
    
    def add_singleton(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainerBuilder':
        """Add singleton service"""
        self._container.register_singleton(service_type, implementation, factory)
        return self
    
    def add_transient(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainerBuilder':
        """Add transient service"""
        self._container.register_transient(service_type, implementation, factory)
        return self
    
    def add_scoped(
        self, 
        service_type: Type[T], 
        implementation: Optional[Type[T]] = None,
        factory: Optional[Callable[[], T]] = None
    ) -> 'DIContainerBuilder':
        """Add scoped service"""
        self._container.register_scoped(service_type, implementation, factory)
        return self
    
    def add_instance(self, service_type: Type[T], instance: T) -> 'DIContainerBuilder':
        """Add singleton instance"""
        self._container.register_instance(service_type, instance)
        return self
    
    def build(self) -> DIContainer:
        """Build the container"""
        return self._container
    
    def build_provider(self) -> ServiceProvider:
        """Build service provider"""
        return ServiceProvider(self._container)