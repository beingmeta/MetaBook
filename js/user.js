/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/user.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents.

   For more information on knodules, visit www.knodules.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.

   This program comes with absolutely NO WARRANTY, including implied
   warranties of merchantability or fitness for any particular
   purpose.

   Use and redistribution (especially embedding in other
   CC licensed content) is permitted under the terms of the
   Creative Commons "Attribution-NonCommercial" license:

   http://creativecommons.org/licenses/by-nc/3.0/ 

   Other uses may be allowed based on prior agreement with
   beingmeta, inc.  Inquiries can be addressed to:

   licensing@beingmeta.com

   Enjoy!

*/
/* jshint browser: true */

// user.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log;
    var fdjtTime=fdjt.Time, $ID=fdjt.ID;
    var RefDB=fdjt.RefDB, Ref=fdjt.Ref, fdjtState=fdjt.State;
    
    var mR=metaReader, Trace=mR.Trace;

    var getLocal=fdjtState.getLocal;
    var setLocal=fdjtState.setLocal;
    var saveLocal=mR.saveLocal;

    function sourceref(arg){
        if (arg instanceof Ref) return arg;
        else if (typeof arg === "string")
            return mR.sourcedb.ref(arg);
        else return false;}

    function setUser(userinfo,outlets,layers,sync){
        var started=fdjtTime();
        var root=document.documentElement||document.body;
        if (Trace.startup>1)
            fdjtLog("Setting up user %s (%s)",userinfo._id,
                    userinfo.name||userinfo.email);
        if (userinfo) {
            fdjtDOM.dropClass(root,"_NOUSER");
            fdjtDOM.addClass(root,"_USER");}
        if (metaReader.user) {
            if (userinfo._id===metaReader.user._id) {}
            else throw { error: "Can't change user"};}
        var cursync=metaReader.sync;
        if ((cursync)&&(cursync>sync)) {
            fdjtLog.warn(
                "Cached user information is newer (%o) than loaded (%o)",
                cursync,sync);}
        if ((navigator.onLine)&&
            (getLocal("mR("+mR.docid+").queued")))
            metaReader.writeQueuedGlosses();
        metaReader.user=metaReader.sourcedb.Import(
            userinfo,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
        if (outlets) metaReader.outlets=outlets.map(sourceref);
        if (layers) metaReader.layers=layers.map(sourceref);
        // No callback needed
        metaReader.user.save();
        saveLocal("mR.user",metaReader.user._id);
        // We also save it locally so we can get it synchronously
        saveLocal(metaReader.user._id,metaReader.user.Export(),true);
        if (metaReader.locsync) metaReader.setConfig("locsync",true);
        metaReader.saveProps();
        
        if (Trace.startup) {
            var now=fdjtTime();
            fdjtLog("setUser %s (%s) done in %dms",
                    userinfo._id,userinfo.name||userinfo.email,
                    now-started);}
        metaReader._user_setup=fdjtTime();
        // This sets up for local storage, now that we have a user 
        if (metaReader.cacheglosses) metaReader.setCacheGlosses(true);
        if (metaReader._ui_setup) setupUI4User();
        return metaReader.user;}
    metaReader.setUser=setUser;
    
    function setNodeID(nodeid){
        if (!(metaReader.nodeid)) {
            metaReader.nodeid=nodeid;
            if ((nodeid)&&(metaReader.persist))
                setLocal("mR("+mR.docid+").nodeid",nodeid,true);}}
    metaReader.setNodeID=setNodeID;

    function setupUI4User(){
        if (metaReader._user_ui_setup) return;
        var i=0, lim;
        var root=document.documentElement||document.body;
        if (Trace.startup>1) fdjtLog("Starting UI setup for user");
        var startui=fdjtTime();
        if (!(metaReader.user)) {
            fdjtDOM.dropClass(root,"_USER");
            fdjtDOM.addClass(root,"_NOUSER");
            return;}
        fdjtDOM.addClass(root,"_USER");
        fdjtDOM.dropClass(root,"_NOUSER");
        var username=metaReader.user.name||metaReader.user.handle||metaReader.user.email;
        if (username) {
            if ($ID("METABOOKUSERNAME"))
                $ID("METABOOKUSERNAME").innerHTML=username;
            if ($ID("CODEXUSERNAME"))
                $ID("CODEXUSERNAME").innerHTML=username;
            var names=document.getElementsByName("METABOOKUSERNAME");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}
            names=document.getElementsByName("CODEXUSERNAME");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}
            names=fdjtDOM.$(".metareaderusername");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}
            names=fdjtDOM.$(".codexusername");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}}
        if ($ID("SBOOKMARKUSER"))
            $ID("SBOOKMARKUSER").value=metaReader.user._id;
        
        /* Initialize add gloss prototype */
        var ss=metaReader.stylesheet;
        var form=$ID("METABOOKADDGLOSSPROTOTYPE");
        if (metaReader.user.fbid)  
            ss.insertRule(
                "#METABOOKHUD span.facebook_share { display: inline;}",
                ss.cssRules.length);
        if (metaReader.user.twitterid) 
            ss.insertRule(
                "#METABOOKHUD span.twitter_share { display: inline;}",
                ss.cssRules.length);
        if (metaReader.user.linkedinid) 
            ss.insertRule(
                "#METABOOKHUD span.linkedin_share { display: inline;}",
                ss.cssRules.length);
        if (metaReader.user.googleid) 
            ss.insertRule(
                "#METABOOKHUD span.google_share { display: inline;}",
                ss.cssRules.length);
        var maker=fdjtDOM.getInput(form,"MAKER");
        if (maker) maker.value=metaReader.user._id;
        var pic=
            (metaReader.user._pic)||
            (metaReader.user.pic)||
            ((metaReader.user.fbid)&&
             ("https://graph.facebook.com/"+metaReader.user.fbid+
              "/picture?type=square"));
        if (pic) {
            if ($ID("SBOOKMARKIMAGE")) $ID("SBOOKMARKIMAGE").src=pic;
            if ($ID("METABOOKUSERPIC")) $ID("METABOOKUSERPIC").src=pic;
            var byname=document.getElementsByName("METABOOKUSERPIC");
            if (byname) {
                i=0; lim=byname.length; while (i<lim)
                    byname[i++].src=pic;}}
        var idlinks=document.getElementsByName("IDLINK");
        if (idlinks) {
            i=0; lim=idlinks.length; while (i<lim) {
                var idlink=idlinks[i++];
                idlink.target='_blank';
                idlink.title='click to edit your personal information';
                idlink.href='https://my.bookhub.io/profile';}}
        if (metaReader.user.friends) {
            var friends=metaReader.user.friends; var sourcedb=metaReader.sourcedb;
            i=0; lim=friends.length; while (i<lim) {
                var friend=RefDB.resolve(friends[i++],sourcedb);
                metaReader.addTag2Cloud(friend,metaReader.gloss_cloud);
                metaReader.addTag2Cloud(friend,metaReader.share_cloud);}}
        if (metaReader.outlets)
            metaReader.addOutlets2UI(metaReader.outlets);
        if (Trace.startup) {
            var now=fdjtTime();
            fdjtLog("Setup UI for %s (%s) in %dms",
                    metaReader.user._id,metaReader.user.name||metaReader.user.email,
                    now-startui);}
        metaReader._user_ui_setup=true;}
    metaReader.setupUI4User=setupUI4User;

    function loginUser(info){
        metaReader.user=metaReader.sourcedb.Import(
            info,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
        setupUI4User();
        metaReader._user_setup=false;}
    metaReader.loginUser=loginUser;
    
    function userSetup(){
        // Get any local sync information
        var sync=metaReader.sync=
            getLocal("mR("+mR.docid+").sync",true)||0;
        var started=fdjtTime();
        var loadinfo=false, userinfo=false;

        // If the configuration is set to not persist, but there's
        //  a sync timestamp, we should erase what's there.
        if ((metaReader.sync)&&(!(metaReader.persist)))
            metaReader.clearOffline();

        if (metaReader.nologin) {}
        else if ((metaReader.persist)&&(getLocal("mR.user"))) {
            initUserOffline();
            if (Trace.storage) 
                fdjtLog("Local info for %o (%s) from %o",
                        metaReader.user._id,metaReader.user.name,metaReader.sync);
            // Clear any loadinfo read on startup from the
            // application cache but already stored locally.
            if ((metaReader.user)&&(metaReader.sync)&&(metaReader.cacheglosses)&&
                (window._metareader_loadinfo))
                // Clear the loadinfo "left over" from startup,
                //  which should now be in the database
                window._metareader_loadinfo=false;}
        
        if (metaReader.nologin) {}
        else if ((window._metareader_loadinfo)&&
                 (window._metareader_loadinfo.userinfo)) {
            // Get the userinfo from the loadinfo that might have already been loaded
            loadinfo=window._metareader_loadinfo;
            userinfo=loadinfo.userinfo;
            window._metareader_loadinfo=false;
            if (Trace.storage) 
                fdjtLog("Have window._metareader_loadinfo for %o (%s) dated %o: %j",
                        userinfo._id,userinfo.name||userinfo.email,
                        loadinfo.sync,userinfo);
            setUser(userinfo,
                    loadinfo.outlets,loadinfo.layers,
                    loadinfo.sync);
            if (loadinfo.nodeid) setNodeID(loadinfo.nodeid);}
        else if ((metaReader.userinfo)||(window._userinfo)) {
            userinfo=(metaReader.userinfo)||(window._userinfo);
            if ((Trace.storage)||(Trace.startup))
                fdjtLog("Have %s for %o (%s) dated %o: %j",
                        ((metaReader.userinfo)?("metaReader.userinfo"):("window._userinfo")),
                        userinfo._id,userinfo.name||userinfo.email,
                        userinfo.sync||userinfo.modified,userinfo);
            setUser(userinfo,userinfo.outlets,userinfo.layers,
                    userinfo.sync||userinfo.modified);}
        else {}
        if (Trace.startup>1)
            fdjtLog("userSetup done in %dms",fdjtTime()-started);
        if (metaReader.nologin) return;
        else if (!(metaReader.refuri)) return;
        else {}
        if (window.navigator.onLine) {
            if ((metaReader.user)&&(sync))
                fdjtLog("Requesting additional glosses (> %s (%d)) on %s from %s for %s",
                        fdjtTime.timeString(metaReader.sync),metaReader.sync,
                        metaReader.refuri,metaReader.server,metaReader.user._id,metaReader.user.name);
            else if (metaReader.user)
                fdjtLog("Requesting all glosses on %s from %s for %s (%s)",
                        metaReader.refuri,metaReader.server,metaReader.user._id,metaReader.user.name);
            else fdjtLog(
                "No user, requesting user info and glosses from %s",
                metaReader.server);
            metaReader.updateInfo();
            return;}
        else return;}
    metaReader.userSetup=userSetup;

    function initUserOffline(){
        var user=getLocal("mR.user");
        var sync=metaReader.sync;
        if (!(user)) return;
        var nodeid=getLocal("mR("+mR.docid+").nodeid",true);
        // We store the information for the current user
        //  in both localStorage and in the "real" sourcedb.
        // We fetch the user from local storage because we
        //  can do that synchronously.
        var userinfo=user&&getLocal(user,true);
        if (Trace.storage)
            fdjtLog("initOffline user=%s sync=%s nodeid=%s info=%j",
                    user,sync,nodeid,userinfo);
        if (Trace.startup>1)
            fdjtLog("initOffline userinfo=%j",userinfo);
        // Should these really be refs in sourcedb?
        var outlets=metaReader.outlets=
            (getLocal("mR("+mR.docid+").outlets",true)||[]).map(sourceref);
        var layers=metaReader.layers=
            (getLocal("mR("+mR.docid+").layers",true)||[]).map(sourceref);
        if (userinfo) setUser(userinfo,outlets,layers,sync);
        if (nodeid) setNodeID(nodeid);}
    metaReader.initUserOffline=initUserOffline;

    /* Setting up the clouds */
    
    function addOutlets2UI(outlet){
        if (typeof outlet === 'string')
            outlet=metaReader.sourcedb.ref(outlet);
        if (!(outlet)) return;
        if (outlet instanceof Array) {
            var outlets=outlet;
            var i=0; var lim=outlets.length; while (i<lim)
                addOutlets2UI(outlets[i++]);
            return;}
        if (!(outlet instanceof Ref)) return;
        if (outlet._inui) return;
        var completion=fdjtDOM("span.completion.cue.source",outlet._id);
        function init(){
            outlet._inui=completion;
            completion.id="mbOUTLET"+outlet.humid;
            completion.setAttribute("data-value",outlet._id);
            completion.setAttribute("data-key",outlet.name);
            completion.innerHTML=outlet.name;
            if ((outlet.description)&&(outlet.nick))
                completion.title=outlet.name+": "+outlet.description;
            else if (outlet.description)
                completion.title=outlet.description;
            else if (outlet.nick) completion.title=outlet.name;
            fdjtDOM("#METABOOKSHARECLOUD",completion," ");
            metaReader.share_cloud.addCompletion(completion);}
        outlet.onLoad(init,"addoutlet2cloud");}
    metaReader.addOutlets2UI=addOutlets2UI;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
