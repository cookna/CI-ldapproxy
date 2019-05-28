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
    Usage: authUser(id,pwd)

    Description: 
        Used to authenticate user using id and password.  Uses a JSON request to server to validate user based on parameters.
    Parameters:
        id: identification number of user
        pwd: password for user
    Return:
        if id and password are valid the function returns all information regarding specified user, otherwise the function returns null 

### getAllUsers
    Usage: getAllUsers()

    Description:
        Called from command line when input is **ou=users**.  Function creates a JSON request to server and returns all users and their information.
    Return:
        Returns all users and their current information

### getUserbyName 
    Usage: getUserbyName(id)

    Description: 
        Function creates a JSON request to query the cloud in order to find a single user.
    Parameters:
        id: username of requested user
    Return:
        If user is in the cloud all information about user is returned, otherwise function returns null

### getUser 
    Usage: getUser(id)

    Description: 
        Function creates a JSON request to server to return information about user based on id
    Parameter:
        id: Specific indentificaiton number assigned to each user. 
    Return:
        If input parameter is valid identification number is in cloud, the function returns the current information about specified user

### getGroups
    Usage: getGroups()

    Description: 
        Called when querying the server with **ou=groups** as input. Function prints out all group names and basic information about group. 

    Return:
        Returns all group in cloud

### addUser
    Usage: addUser(user)

    Description: 
        Function creates a JSON request to server to create a new user
    Parameter:
        user: Contains specifics about new user
    Return: 
        If user is already in cloud, addUser will ignore it, otherwise function returns information about newly created user

### buildGroups 
    Usage: buildGroups(ga)

    Description: 
        Helper function called from converttoLDAP.  Used to create an array of groups that a user could be apart of.  Called because format of JSON response does not match syntax of how to call JSON request
    Parameters:
        ga: Array of groups associated with user
    Return:
        returns a string of groups

### buildEmails
    Usage: buildEmails(ea)

    Description:
        Helper function called from convertoLDAP.  Used to create a list of emails associated with user.  Called because format of JSON response does not match syntax of how to call JSON request
    Parameters:
        ea: Array of emails associated with user
    Return:
        returns a string of emails

### converttoLDAP
    Usage: converttoLDAP(dn, user, id)

    Description: 
        Convert the JSON result from the cloud identity call to a object to be sent via ldap.  This will build a “fake” ldap entry, and from here we control how much is returned.  In most cases it is some basic attributes with the group entry, for fine grained access control
    Parameters: 
        dn: domain name of user MAYBE
        user: user object containing all attributes associated with user
        id: DONT KNOW 
    Return:
        Returns newly created user object

### convertfromLDAP
    Usage: convertfromLDAP(user)

    Description:
        Takes a user in as a parameter to create a valid JSON formatted object
    Parameter:
        user: user object that is returned from cloud 
    Return:
        returns JSON formatted object

### runLDAPServer
    Usage: runLDAPServer()

    Description: 
        Define the LDAP server properties – last step is to kill the server.  Contains several server commands that are used to access and manipulate the server

    **Server Functions within runLDAPServer**

#### server.bind
    Usage: server.bind(config.ldap.root, function(req,res, next))

    Description:
        Creates a connection between LDAP proxy and Cloud using the username and password provided by input in command-line arguement
    Parameters:
        config.ldap.root: DONT KNOW
        function(req, res, next): HYPERLINK
    Return: 
        Function waits for client to send next request

#### server.search
    Usage: server.seacher(config.ldap.root, function(req, res, next))

    Description: 
        Most of the work happens as part of searches, we will not enable all kinds of searchs but only the ones needed specificially for this implementation.  This samply is tuned for searches done by ISAM using a federeated registry and basic user.  We will use a combination of filter and dn to identify the response we need to create.  NOTE that config.ldap.root is case sensitive so we use a lower case
    Paremeters: 
        config.ldap.root: DONT KNOW
        function(req, res, next): HYPERLINK
    Return: 
        Function waits for client to send next request
#### server.add
    Usage: server.add(config.ldap.root, function(req,res,next))

    Description: 
        Server function that adds a new user to cloud
    Parameters: 
        config.ldap.root: DONT KNOW
        function(req, res, next): HYPERLINK
    Return: 
        Function waits for client to send next request
#### server.listen
    Usage: server.listen(config.ldap.root, function())

    Description:
        Kicks the server
    Parameters:
        config.ldap.root: DONT KNOW 
        function(): NOT USED