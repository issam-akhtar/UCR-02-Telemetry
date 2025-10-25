Security Considerations
=====================

This document outlines security considerations for the UCR-02-Telemetry system.

Introduction
-----------

While the UCR-02-Telemetry system is primarily designed for local network operation in a racing environment, security remains an important consideration, especially for deployments with external connectivity. This document provides guidelines and best practices for securing the telemetry system.

Network Security
-------------

Deployment Considerations
~~~~~~~~~~~~~~~~~~~~~~

The telemetry system exposes several network ports:

* **9091** - Raw telemetry WebSocket ingest
* **9092** - REST API
* **9094** - Frontend WebSocket
* **5432** - PostgreSQL database (internal)
* **3000** - Frontend HTTP server

Best practices for network security:

1. **Network Isolation** - Deploy on a dedicated VLAN or isolated network
2. **Firewall Rules** - Restrict access to necessary ports only
3. **VPN Access** - Use VPN for remote access rather than exposing services directly
4. **Reverse Proxy** - Deploy behind a reverse proxy for TLS termination and authentication

Docker Network Security
~~~~~~~~~~~~~~~~~~~

When using Docker:

.. code-block:: yaml

   # Example docker-compose.yml network configuration
   services:
     backend:
       # ... other configuration ...
       networks:
         - internal
         - frontend
     
     database:
       # ... other configuration ...
       networks:
         - internal
   
   networks:
     internal:
       internal: true  # Not exposed outside Docker
     frontend:
       # Only exposes necessary ports

Authentication
-----------

WebSocket Authentication
~~~~~~~~~~~~~~~~~~~~

The WebSocket servers support token-based authentication:

.. code-block:: javascript

   // Client authentication example
   const ws = new WebSocket(`ws://server:9094/ws?token=${authToken}`);

To enable authentication, modify the server configuration:

.. code-block:: yaml

   websocket:
     auth_enabled: true
     auth_token: "your-secure-token"  # Use environment variables in production

REST API Authentication
~~~~~~~~~~~~~~~~~~~

For the REST API, implement authentication at the reverse proxy level or by modifying the Gin routes:

.. code-block:: go

   // Authentication middleware
   func AuthMiddleware() gin.HandlerFunc {
       return func(c *gin.Context) {
           token := c.GetHeader("Authorization")
           if token != "Bearer " + os.Getenv("API_TOKEN") {
               c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
               return
           }
           c.Next()
       }
   }
   
   // Apply to routes
   api := router.Group("/api/v1")
   api.Use(AuthMiddleware())
   {
       api.GET("/historical/cell-data", handler.GetCellData)
       // Other routes...
   }

Database Security
--------------

The TimescaleDB database should be secured:

1. **Strong Passwords** - Use strong, unique passwords
2. **Least Privilege** - Create specific database users with minimal permissions
3. **Network Restrictions** - Restrict database access to the backend service only
4. **Connection Encryption** - Enable TLS for database connections

Example of secure database configuration:

.. code-block:: yaml

   database:
     connection_string: "postgresql://telemetry_user:${DB_PASSWORD}@db:5432/telem_db?sslmode=require"

Data Security
----------

Sensitive Data
~~~~~~~~~~~

Consider whether your telemetry data contains sensitive information:

* **Proprietary Performance Data** - May require additional protection
* **Location Data** - Consider privacy implications if tracking vehicle location
* **System Parameters** - Some parameters may reveal proprietary settings

Data Encryption
~~~~~~~~~~~~

For sensitive data:

1. **Encrypt data in transit** - Use TLS for all connections
2. **Encrypt sensitive data at rest** - Use database column encryption if needed

Input Validation
-------------

All inputs should be validated:

1. **WebSocket Messages** - Validate format and size
2. **REST API Parameters** - Validate types, ranges, and formats
3. **CSV Data** - Validate format and content

Example of input validation:

.. code-block:: go

   // Validate time range parameters
   func parseTimeRange(c *gin.Context) (time.Time, time.Time, error) {
       startStr := c.Query("start_time")
       endStr := c.Query("end_time")
       
       if startStr == "" || endStr == "" {
           return time.Time{}, time.Time{}, errors.New("start_time and end_time are required")
       }
       
       start, err := parseTime(startStr)
       if err != nil {
           return time.Time{}, time.Time{}, err
       }
       
       end, err := parseTime(endStr)
       if err != nil {
           return time.Time{}, time.Time{}, err
       }
       
       if end.Before(start) {
           return time.Time{}, time.Time{}, errors.New("end_time must be after start_time")
       }
       
       return start, end, nil
   }

Denial of Service Protection
-------------------------

Protect against DoS attacks:

1. **Rate Limiting** - Limit requests per client
2. **Message Size Limits** - Prevent oversized messages
3. **Connection Limits** - Limit connections per IP
4. **Timeouts** - Implement reasonable timeouts

Example of WebSocket DoS protection:

.. code-block:: go

   // Rate limiter for WebSocket connections
   var limiter = rate.NewLimiter(rate.Limit(10), 30)  // 10 requests per second, burst of 30
   
   // Check rate limit before upgrading connection
   if !limiter.Allow() {
       http.Error(w, "Too many connections", http.StatusTooManyRequests)
       return
   }

Secure Development Practices
-------------------------

1. **Dependency Management** - Keep dependencies updated
2. **Code Reviews** - Review security-sensitive code
3. **Automated Testing** - Include security tests
4. **Vulnerability Scanning** - Scan code and dependencies

Security Checklist
---------------

Use this checklist for deployments:

* [ ] All default passwords changed
* [ ] Database using strong password and restricted network access
* [ ] WebSocket authentication enabled if required
* [ ] API endpoints properly secured
* [ ] Network properly segmented
* [ ] TLS configured for external access
* [ ] Rate limiting configured
* [ ] Firewall rules in place
* [ ] Regular updates and patches applied