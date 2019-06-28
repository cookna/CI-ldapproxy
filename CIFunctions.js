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
const request = require('request-promise-native');
const log = require('tracer').colorConsole({level: config.log});
const CIRequest = require('./CIRequest');
// log levels are log - trace - debug - info - warn - error

var token = new CIToken();
var req = new CIRequest();




// Exports the functions above so that other modules can use them
module.exports = class CIFunctions {
    async init(conf) {
        log.debug('CIRequest.init()');
        this.config = conf;
        req.init(conf);
        token.init(conf.tenant.ui,conf.tenant.id,conf.tenant.secret);
      }

    
     async authUser(id, pwd) {
        log.debug('authUser(id,pwd) (%s,%s)',id,pwd);
      
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
async getAllUsers() {
 
    try {
      let cred = await req.get("/v2.0/Users");
      cred = JSON.parse(cred);
      //log.info(cred);
      return cred;
      }
      catch(e) {
      log.error('Error with gathering realm');
      return null;
    }
  }
  
  // get a single user by name
  async getUserbyName(id) {
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
  async getUser(id) {
    log.debug('(id) (%s)', id);
  
    try {
      let cred = await req.get('/v2.0/Users/' + id);
      return JSON.parse(cred);
    } catch (e) {
      log.error('try catch is ', e);
      return null;
    }
  }
  
  async getAllGroups() {
    
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
  
  async getGroup(id) {
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
  async addUser(user) {
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
   buildGroups(ga) {
    let gl = [];
    if (ga != undefined) {
      ga.forEach(function(item){
        gl.push(item.displayName)
      })
    }
    return gl;
  }
  // Build a string of emails
   buildEMails(ea) {
    let el = [];
    if (ea != undefined) {
      ea.forEach(function(item){
        el.push(item.type+'-'+item.value)
      })
    }
    return el;
  }
  
 buildMember(ma) {
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
  
  
 convertGrouptoLDAP(group) {
    log.info('Converting group to LDAP');
    //log.trace(JSON.stringify(group));
  
    var obj = {
        dn: config.ldap.type+group.displayName +','+config.ldap.root,
        attributes: {
          displayName: group.displayName,
          created: group.meta.created,
          lastModified: group.meta.created,
          resourceType: group.meta.resourceType,
          members: this.buildMember(group.members)
        }
        
        
    }
    //log.info(obj);
    return obj; 
  }
  
   convertGroupstoLDAP(groups) {
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
        members: this.buildMember(go.members)
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
   converttoLDAP(dn, user, id) {
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
        email: this.buildEMails(id.emails),
        phone: this.buildEMails(id.phoneNumbers),
        memberof: this.buildGroups(id.groups),
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
   convertfromLDAP(user) {
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
      
};
