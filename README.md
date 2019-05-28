# CI-ldapproxy
A nodejs based ldapproxy to the CI web services.


## Start-up
1. In order to query the proxy, start up the server by typing node ldapproxy.js
2. From separate terminal window run some built in functionalities the proxy allows
  * Example query
    * ldapsearch -h localhost -p 389 -D "uid=username, o=pps" -w password -b "o=pps" ou=groups
      - h: DONT KNOW HOW TO EXPLAIN
      - p: Port Number
      - D: 
        - uid: username of valid user on cloud
        - o= DONT KNOW 
      - w: Password of valid user
      - b: DONT KNOW
      - last agruement is what the proxy will interpret and determine which functionality to use.
        * Proxy Functions
          * ou=groups: Returns all groups
          * ou=users: Returns all Users
          * ou=_username_: Returns all information on the _username_, if _username_ is not in cloud null it returned 

## Functions in ldapproxy.js

### authUser
    _authUser(id, pwd)_

    Description: 
        Used to authenticate user using id and password.  Uses a JSON request to server to validate user based on parameters.

