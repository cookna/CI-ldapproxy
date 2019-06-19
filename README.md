# CI-ldapproxy
A nodejs based ldapproxy to the CI web services.

## Materials
* IDE to run command-line arguements
* Nodejs - [installation](https://nodejs.org/en/download/)
* javaScript
* JSON


## Start-up
1. In order to query the proxy, start up the server by entering node ldapproxy.js into terminal/IDE terminal
2. Install Nodejs using link in materials
  * In directory where project is located type command _npm install_ to install nodejs modules.  This will solve any 'Cannot find Module' errors at compile-time
3. From separate terminal window run some built in functionalities the proxy allows
  * Example query
    * ldapsearch -h localhost -p 389 -D "uid=username, o=pps" -w password -b "o=pps" ou=groups
      - ldapsearch: specific function call to the cloud identity server. 
        List of all server functions
          - ldapsearch
          - ldapadd
      - h: DONT KNOW HOW TO EXPLAIN
      - p: Port Number
      - D: 
        - uid: username of valid user on cloud
        - o= DONT KNOW 
      - w: Password of valid user
      - b: Container search.
        List of Container searches:
          - "ou=users, o=pps": searches users
          - "ou=groups, o=pps": searches groups
          - "o=pps": searches both users and groups
      - last agruement is what the proxy will interpret and determine which container to use. Depending on -b arguement.
          - With -b of "ou=groups, o=pps"
            * uid= _groupName_ : returns _groupName_ information 
            * If there is no argument, all groups are returned.
          - With -b of "ou=users, o=pps"
            * uid= _username_ : returns _username_ information 
            * If there is no argument, all users are returned. 

## Functions in CIFunctions.js

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
### convertGrouptoLDAP
    Usage: convertGrouptoLDAP(group);

    Description: 
        Function take in a group object as a parameter and converts object into ldap object.
    Parameters:
        group: group object containing display name - date created - last time modified.
    Returns: 
        LDAP compatible object.

### convertGroupstoLDAP
    Usage: convertGroupstoLDAP(group)

    Description:
        Function takes in an array of all groups then converts them into an array of LDAP compatible objects that will be sent to client. 

    Parameters:
        groups: array of groups.
    Returns:   
        Array of LDAP compatible group objects
    
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

## Functions in ldapproxy.js

#### server.bind
    Usage: server.bind(config.ldap.root, function(req,res, next))

    Description:
        Creates a connection between LDAP proxy and Cloud using the username and password provided by input in command-line arguement
    Parameters:
        config.ldap.root: DONT KNOW
        function(req, res, next): For a more detailed description [click](https://medium.com/@selvaganesh93/how-node-js-middleware-works-d8e02a936113)
    Return: 
        Function waits for client to send next request

#### server.search
    Usage: server.seacher('ou=users, o=pps', function(req, res, next))

    Description: 
        Most of the work happens as part of searches, we will not enable all kinds of searchs but only the ones needed specificially for this implementation.  This samply is tuned for searches done by ISAM using a federeated registry and basic user.  We will use a combination of filter and dn to identify the response we need to create.  NOTE that config.ldap.root is case sensitive so we use a lower case
    Paremeters: 
        'ou=users, o=pps': Creates container, searching only users
        function(req, res, next): For a more detailed description [click](https://medium.com/@selvaganesh93/how-node-js-middleware-works-d8e02a936113)
    Return: 
        Function waits for client to send next request

#### server.search
    Usage: server.seacher('ou=groups, o=pps', function(req, res, next))

    Description: 
        Most of the work happens as part of searches, we will not enable all kinds of searchs but only the ones needed specificially for this implementation.  This samply is tuned for searches done by ISAM using a federeated registry and basic user.  We will use a combination of filter and dn to identify the response we need to create.  NOTE that config.ldap.root is case sensitive so we use a lower case
    Paremeters: 
        'ou=groups, o=pps': Creates container, searching only groups
        function(req, res, next): For a more detailed description [click](https://medium.com/@selvaganesh93/how-node-js-middleware-works-d8e02a936113)
    Return: 
        Function waits for client to send next request

#### server.add
    Usage: server.add(config.ldap.root, function(req,res,next))

    Description: 
        Server function that adds a new user to cloud
    Parameters: 
        config.ldap.root: DONT KNOW
        function(req, res, next): For a more detailed description [click](https://medium.com/@selvaganesh93/how-node-js-middleware-works-d8e02a936113)
    Return: 
        Function waits for client to send next request
#### server.listen
    Usage: server.listen(config.ldap.root, function())

    Description:
        Kicks the server
    Parameters:
        config.ldap.root: DONT KNOW 
        function(): NOT USED


## Functions in CIRequest
    Description: CIRequest is an abstract class that contains all REST calls used in ldapproxy.js

### GET
    Usage: get(url)
    
    Description: REST call that takes in url as argument.  GET calls the cloud identity tenant and returns specified data . 

```javascript
async get(url = '/') {
    log.debug('(url): ',url);

    var options = {
      uri: this.config.tenant.ui+url,
      method: "GET",
      headers: { "authorization": "Bearer "+token.get() },
    }

    return await request(options);
}
```
    Options Variable: 
        uri: cloud identity tenant plus the specific search url from parameter.
        method: GET - type of request.
        headers: This information contains information on the token created in initialization for security

    Return: 
        Function makes the REST call and awaits the return object

### POST
    Usage: post(url, Inbody)

    Description: REST call that takes in the url and body of data that is to be added to specified tenant.

```javascript
    async post(url = '/', Inbody) {
      log.debug('(url): ', url);

      var options = {
          uri: this.config.tenant.ui+url+this.config.tenant.registry,
          method: "POST",
          json: true,
          headers: { "Accept": "application/json", "Content-Type": "application/json", "authorization": "Bearer "+token.get()},
          body: Inbody
      }

      return await request(options);
  }
```
    Options Varible: 
        uri: cloud identity tenant uri plus the post destination plus the tenant registry
        method: POST - type of request
        json: true
        headers: This information contains information on the token created in initialization for security

    Return: 
        After option varible is initialized, the POST is called to specific tenant and uri, then waits for data to be posted, returns whether call was successful.  