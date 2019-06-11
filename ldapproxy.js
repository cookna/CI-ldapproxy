/*************************************************************************************
* IBM Security Product Professional Services
* schmidtm@us.ibm.com
* nathan.a.cook@ibm.com
*
* A simple ldap proxy to the CIx webservices to provide the following operations
* over an LDA Protocol
* Simple Bind
* Simple Search (no wild cards, i.e. a person lookup)
* Simple User create using ldif
*
* April 2019
*
*/
'use strict'
const config = require('./dev.js');
const CIToken = require('./CIToken.js');
const ldap = require('ldapjs');
const request = require('request-promise-native');
const log = require('tracer').colorConsole({level: config.log});
const CIRequest = require('./CIRequest');
// log levels are log - trace - debug - info - warn - error


// Variables we need:
var token = new CIToken();
var req = new CIRequest();


// authenticate user
async function authUser(id, pwd) {
    log.debug('authUser(id,pwd) (%s,%s)',id,pwd);

 /*   var options = {
      uri: config.tenant.ui+'/v1.0/authnmethods/password/'+config.tenant.registry,
      method: "POST",
      json: true,
      headers: { "Accept": "application/json", "Content-Type": "application/json", "authorization": "Bearer "+token.get() },
      body: {
        "username": id,
        "password": pwd
      }
    } */ 

    var body = {
      'username': id,
      'password': pwd
    }

    try {
      let url = '/v1.0/authnmethods/password/';
      return await req.post(url, body);
    } catch (e) {
      log.error('try catch is ', e);
      return null;
    }
  }

//Returns all Users
async function getAllUsers() {
 
  try {
    let cred = await req.get("/v2.0/Users");
    cred = JSON.parse(cred);
    //log.info(cred);
    return cred;
    //Parse over cred obj to identify realm
   // for(var i in cred ) {

     // if(realm1.localeCompare(compareStr) == 0) {
     //   log.info(cred.Resources[i]);
     //   converttoLDAP(cred.Resources[i])
        //var obj = convertfromLDAP(cred.Resources[i].userName, cred.Resources, cred.Resources[i].id)
      //}
      //log.info(cred.Resources[i]['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'].realm);
    }
    catch(e) {
    log.error('Error with gathering realm');
    return null;
  }
  return null;

  try {
    let cred = await request(options);
    cred = JSON.parse(cred);

    if(cred.totalResults <= 1) {
      log.warn('Error with totalResults %s', cred.totalResults);
      return null;
    }
    return cred;
  }
    catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  
}

// get a single user by name
async function getUserbyName(id) {
    log.debug('(id) (%s)', id);

    try {
      let cred = await req.get('/v2.0/Users?filter=userName eq "' + id + '"');
      cred = JSON.parse(cred);

      // if we do not find a user we do not throw any error so check if result is 0
      if (cred.totalResults != 1) {
          log.warn('Error with totalResults %s', cred.totalResults);
          return null;
      }
      return cred;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
}

// get a single user by id
async function getUser(id) {
  log.debug('(id) (%s)', id);

  try {
    let cred = await req.get('/v2.0/Users/' + id);
    return JSON.parse(cred);
  } catch (e) {
    log.error('try catch is ', e);
    return null;
  }
}

async function getGroups() {
  
  try {
    let cred = await req.get('/v2.0/Groups/');
    cred = JSON.parse(cred);

 //   log.info(cred);
    return cred;
  } catch(e) {
    log.error('try catch is ', e);
    return null;
  }
}

async function getGroup(id) {
  try {
    let cred = await req.get('/v2.0/Groups/' + id);
    cred = JSON.parse(cred);

//    log.info(cred);
    return cred;
  } catch(e) {
    log.error('Group id does not exist');
    return null;
  }
}

// add a single user
async function addUser(user) {
  log.trace('user:', user);

  var options = {
    uri: config.tenant.ui+'/v2.0/Users',
    method: "POST",
    headers: { "authorization": "Bearer "+token.get(), "Content-Type":"application/scim+json" },
    body: JSON.stringify(user)
  }

  try {
    return await request(options);
  } catch (e) {
    // if we already have the user, ignore it.
    // surpress the long error message and just display the short.
    log.info('Failed with ',e.message)
    log.trace('try catch is', e);
    
    return e.statusCode;
  }
}
// Build a string of group names
function buildGroups(ga) {
  let gl = [];
  if (ga != undefined) {
    ga.forEach(function(item){
      gl.push(item.displayName)
    })
  }
  return gl;
}
// Build a string of emails
function buildEMails(ea) {
  let el = [];
  if (ea != undefined) {
    ea.forEach(function(item){
      el.push(item.type+'-'+item.value)
    })
  }
  return el;
}

function buildMember(ma) {
  log.info('Building Member');
 // log.trace(JSON.stringify(ma));
  let ml = [];
  if(ma != undefined) {
    ma.forEach(function(item) {
      ml.push(item.name.formatted);
    })
    
  }
  return ml
  }


  function convertGrouptoLDAP(group) {
  log.info('Converting group to LDAP');
  //log.trace(JSON.stringify(group));

  var obj = {
      dn: config.ldap.type+group.displayName +','+config.ldap.root,
      attributes: {
        displayName: group.displayName,
        created: group.meta.created,
        lastModified: group.meta.created,
        resourceType: group.meta.resourceType,
        members: buildMember(group.members)
      }
      
      
  }
  //log.info(obj);
  return obj; 
}

function convertGroupstoLDAP(groups) {
  var obj = []
  //log.trace(JSON.stringify(groups));
  groups.Resources.forEach(go => {
  obj.push({
    dn: config.ldap.type+go.displayName +','+config.ldap.root,
    attributes: {
      displayName: go.displayName,
      created: go.meta.created,
      lastModified: go.meta.created,
      resourceType: go.meta.resourceType,
      members: buildMember(go.members)
    }
}); 
  });
  return obj;
}
// Convert the JSON result from the CIx call to a object to be sent via ldap
// This will build a "fake" ldap entry, and from here we control how much is returned
// In most cases it is some basic attributes with the groups entry, for fine
// grained access control.
// We only print a single entry, all others will fail i.e. 0 or 2 or more.
function converttoLDAP(dn, user, id) {
  log.debug('entry');
  log.trace(JSON.stringify(user));

  var obj = {
    dn: config.ldap.type+dn+","+config.ldap.root,
    attributes: {
      objectclass: ['top','person','organizationalPerson','inetOrgPerson','ePerson'],
      cn: dn,
      uid: dn,
      sn: dn,
      description: '',
      sn: user.name.familyName,
      givenName: user.name.givenName,
      active: user.active,
      id: user.id,
      userName: user.name.userName,
      email: buildEMails(id.emails),
      phone: buildEMails(id.phoneNumbers),
      memberof: buildGroups(id.groups),
      created: id.meta.created,
      lastModified: id.meta.lastModified,
      pwdChangedTime: id['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'].pwdChangedTime,
      userCategory: id['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'].userCategory,
      twoFactorauth: id['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'].twoFactorAuthentication,
      realm: id['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'].realm
    }
  }
  return(obj);
}

// Convert the object to JSON 
function convertfromLDAP(user) {
  log.debug('entry');
  log.trace(JSON.stringify(user));
  let obj;

  try {
    obj = {
      userName: user.uid[0],
      displayName: user.displayname[0],
      name: {
        givenName: user.givenname[0],
        familyName: user.sn[0],
      },
      active: true,
      emails: [{
        type: "work",
        value: user.email[0]
      }], 
      schemas: [ "urn:ietf:params:scim:schemas:core:2.0:User",
                 "urn:ietf:params:scim:schemas:extension:ibm:2.0:Notification" ]
    }
  } catch (e) {
    log.error('Error building entry: ',e);
  }
  return(obj);
}
// Define the ldap server functions and properties - last step is to kick it.
 function runLDAPServer() {
    log.debug('entry');
    var server = ldap.createServer();

    // Use this for debugging, remove later
    /**server.use(function(req, res, next) {
      log.log();
      log.log('USE req  = ', req);
      log.log('USE res  = ', res);
      return next();
    });*/


  server.bind(config.ldap.root, function(req, res, next) {
    log.debug('Bind');
    
    // get the user name and the password provided by the simple bind
    // note we need to cut out the user name, which is between the first
    // = and the first ,  uid=bob,xxx
    let id=req.dn.toString();
    id=id.substring(id.indexOf('=')+1);
    id=id.substring(0,id.indexOf(','));
    let pwd=req.credentials;
    log.trace('Login %s - %s', id, pwd);
    let status = authUser(id, pwd).then( status => {
      if (status == null) {
        log.error('Failed authentication')
        return next(new ldap.InvalidCredentialsError());
      }
      res.end();
      return next();
    });
  });

  // the compare should not be need, included here as a place holder
  server.compare(config.ldap.root, function(req, res, next) {
    log.trace('===> DN: ', req.dn.toString());
    log.trace('===> attribute name: ', req.attribute);
    log.trace('===> attribute value: ', req.value);
    res.end(req.value === 'foo');
    return next();
  });

  // most of the work happens as part of searches, we will not enable all kinds
  // of searches but only the ones needed specifically for this implementation
  // this sample is tuned for searches done by ISAM using a federated registry
  // and basic user
  // we will use a combination of filter and dn to identify the response we need
  // to create.
  // NOTE that the config.ldap.root is case sensitive, so we use a lower case!
  server.search(config.ldap.root, function(req, res, next) {
    log.debug('entry');
    let filter=req.filter.toString();
    log.trace('search filter = ', filter);
    let dn=req.baseObject.toString();
    log.trace('search dn = ', dn);

    // We do not supconfig.ldap.port searches, these are really lookups
    // in other words, the username is either part of the filter,
    // or it is part of the DN
    if (filter=='(|(objectclass=eperson)(objectclass=person))') {
      var id = dn.substring(dn.indexOf('=')+1);
      id=id.substring(0,id.indexOf(','));
      log.trace('search id in dn = ', id);
    } else {
      var id = filter.substring(filter.indexOf('=')+1);
      id=id.substring(0,id.indexOf(')'));
      log.trace('search id in filter = ', id);
      //Parsing -b tag to see what container to search
      if(dn == "ou=groups, o=pps") {
        if(id == '*' || id == undefined) {
          log.info("Searching for Groups");
          getGroups().then ( groups => {
            if(groups == null) {
              info.warn("No Groups Available");
              res.end();
              return next();   
            }
            log.info(groups);
          
            var resp = convertGroupstoLDAP(groups);
            log.trace(resp);
            //Loop sends basic information about all groups i.e. name - created - last time modified
            resp.forEach(sd => {
              res.send(sd);
            })

            res.end();
          
          
        });
        log.info("Exiting groups search body");
        //res.end();
        return next();
        }
        else {
          //Searching for a specific group 
          getGroups().then(async groups => {
            if(groups == null) {
              log.warn("Invalid return, no groups available");
              res.end();
              return next();
            }

            groups.Resources.forEach(async gp => {
              if(gp.displayName == id) {
                getGroup(gp.id).then(async retObj => {
                  if(retObj != undefined) {
                    var ret = convertGrouptoLDAP(retObj);
                    res.send(ret);
                    res.end();
                    return next();
                  }
                })
              }
            })
          })
         }
      }
      else if(dn == "ou=users, o=pps") {
        log.info("Searching users");
        //If id is empty or undefined return container with all users
        if(id == '*' || id == undefined) {
          log.info("String matchs users calling get all users");
  
          getAllUsers().then( obj2 => {
            if(obj2 == null) {
              log.warn("Invalid return");
              res.end();
              return next();
            }
            //Iterate over list of users
            for(var i in obj2.Resources) {          
              var obj = converttoLDAP(obj2.Resources[i].name.givenName, obj2.Resources[i], obj2.Resources[i]);   
              res.send(obj);       
            }
            log.info("Exiting User forloop");
            res.end();
            return next();
            });
        }
        //If id is defined search for specificed user
        else {
          getUserbyName(id).then( status => {
            if (status == null) {
              log.warn('search with getUserbyName == null');
              res.end();
              return next();
            }
            getUser(status.Resources[0].id).then( status2 => {
              if (status2 == null) {
                log.warn('search with getUser == null');
                res.end();
                return next();
              }
      
              var obj = converttoLDAP(id, status.Resources[0], status2);
      
              res.send(obj);
              res.end();
              return next();
            });
          });
        }
      }
      //Base search of all users and groups
      else if(dn == "o=pps") {
        getAllUsers().then(async obj2 => {
          if(obj2 == null) {
            log.warn("Invalid return");
            res.end();
            return next();
          }
          //Iterate over list of users
          for(var i in obj2.Resources) {          
            var obj = converttoLDAP(obj2.Resources[i].name.givenName, obj2.Resources[i], obj2.Resources[i]);   
            res.send(obj);       
          }
          log.info("Exiting User forloop");
          });
          log.info("Searching for Groups");
          getGroups().then (async groups => {
            if(groups == null) {
              info.warn("No Groups Available");
              res.end();
              return next();   
            }
            log.info(groups);
          
            var resp = convertGroupstoLDAP(groups);
            log.trace(resp);
            //Loop sends basic information about all groups i.e. name - created - last time modified
            resp.forEach(async sd => {
              res.send(sd);
            })
            log.info("Exiting for loop");
            res.end();
            return next();
          
        });
      }
  }
  });


// Search for the root base!
// We just return our root base.
// if the base search has a filter that looks for members, return nothing!
  server.search('', function(req, res, next) {
    log.debug('BASE search');
    let filter=req.filter.toString();
    log.trace('BASE search filter = ', filter);
    let dn=req.baseObject.toString();
    log.trace('BASE search dn = ', dn);

    // We do not supconfig.ldap.port searches for groups, so if the filter includes a
    // substring like member= we will return nothing.
    if (filter.indexOf('member=') > -1) {
      log.log('BASE SEARCH not allowed member filter');
      res.end();
      return next();
    }

    let obj = {
      dn: config.ldap.root,
      attributes: {
        objectclass: ['organization','top'],
        o: config.ldap.root.substring(config.ldap.root.indexOf('=')+1)
      }
    }

    res.send(obj);
    res.end();
    return next();
  });

  




  // An add example
  server.add(config.ldap.root, function(req, res, next) {
    log.debug('ADD entry');
    log.trace('DN: ' + req.dn.toString());
    log.trace('Entry attributes: ', req.toObject().attributes);
 
    addUser(convertfromLDAP(req.toObject().attributes)).then( r => {
      log.trace('add result is ',r);
      if (r==undefined) {
        return next(new ldap.UnwillingToPerformError());
      }
      if (r==409) {
        log.trace('Handling the 409')
        return next(new ldap.EntryAlreadyExistsError(req.dn.toString()));
      }
      res.end();      
      return next();
    })
  });

  // Kick the server
  server.listen(config.ldap.port, function() {
    console.log('%s : LDAP server listening at %s and using token %s', new Date().toLocaleString(), server.url, token.get());
  });
}

// Main Program
async function main() {
    log.info('start');
    // Initialize the token
    token.init(config.tenant.ui,config.tenant.id,config.tenant.secret);
    req.init(config)
    // Run the actual Server
    runLDAPServer();

    log.info('exit');
}

// Main Start
main();
