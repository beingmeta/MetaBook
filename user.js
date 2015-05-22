/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/user.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
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
    
    var mB=metaBook, Trace=mB.Trace;

    var getLocal=fdjtState.getLocal;
    var setLocal=fdjtState.setLocal;
    var saveLocal=mB.saveLocal;

    function sourceref(arg){
        if (arg instanceof Ref) return arg;
        else if (typeof arg === "string")
            return mB.sourcedb.ref(arg);
        else return false;}

    function setUser(userinfo,outlets,layers,sync){
        var started=fdjtTime();
        var root=document.documentElement||document.body;
        fdjtLog("Setting up user %s (%s)",userinfo._id,
                userinfo.name||userinfo.email);
        if (userinfo) {
            fdjtDOM.dropClass(root,"_NOUSER");
            fdjtDOM.addClass(root,"_USER");}
        if (metaBook.user) {
            if (userinfo._id===metaBook.user._id) {}
            else throw { error: "Can't change user"};}
        var cursync=metaBook.sync;
        if ((cursync)&&(cursync>sync)) {
            fdjtLog.warn(
                "Cached user information is newer (%o) than loaded (%o)",
                cursync,sync);}
        if ((navigator.onLine)&&
            (getLocal("mB("+metaBook.refuri+").queued")))
            metaBook.writeQueuedGlosses();
        metaBook.user=metaBook.sourcedb.Import(
            userinfo,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
        if (outlets) metaBook.outlets=outlets.map(sourceref);
        if (layers) metaBook.layers=layers.map(sourceref);
        // No callback needed
        metaBook.user.save();
        saveLocal("mB.user",metaBook.user._id);
        // We also save it locally so we can get it synchronously
        saveLocal(metaBook.user._id,metaBook.user.Export(),true);
        if (metaBook.locsync) metaBook.setConfig("locsync",true);
        metaBook.saveProps();
        
        if (Trace.startup) {
            var now=fdjtTime();
            fdjtLog("setUser %s (%s) done in %dms",
                    userinfo._id,userinfo.name||userinfo.email,
                    now-started);}
        metaBook._user_setup=fdjtTime();
        // This sets up for local storage, now that we have a user 
        if (metaBook.cacheglosses) metaBook.setCacheGlosses(true);
        if (metaBook._ui_setup) setupUI4User();
        return metaBook.user;}
    metaBook.setUser=setUser;
    
    function setNodeID(nodeid){
        var refuri=metaBook.refuri;
        if (!(metaBook.nodeid)) {
            metaBook.nodeid=nodeid;
            if ((nodeid)&&(metaBook.persist))
                setLocal("mB("+refuri+").nodeid",nodeid,true);}}
    metaBook.setNodeID=setNodeID;

    function setupUI4User(){
        if (metaBook._user_ui_setup) return;
        var i=0, lim;
        var root=document.documentElement||document.body;
        if (Trace.startup>1) fdjtLog("Starting UI setup for user");
        var startui=fdjtTime();
        if (!(metaBook.user)) {
            fdjtDOM.addClass(root,"_NOUSER");
            return;}
        fdjtDOM.addClass(root,"_NOUSER");
        fdjtDOM.dropClass(root,"_NOUSER");
        var username=metaBook.user.name||metaBook.user.handle||metaBook.user.email;
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
            names=fdjtDOM.$(".metabookusername");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}
            names=fdjtDOM.$(".codexusername");
            if ((names)&&(names.length)) {
                i=0; lim=names.length; while (i<lim)
                    names[i++].innerHTML=username;}}
        if ($ID("SBOOKMARKUSER"))
            $ID("SBOOKMARKUSER").value=metaBook.user._id;
        
        /* Initialize add gloss prototype */
        var ss=metaBook.stylesheet;
        var form=$ID("METABOOKADDGLOSSPROTOTYPE");
        if (metaBook.user.fbid)  
            ss.insertRule(
                "#METABOOKHUD span.facebook_share { display: inline;}",
                ss.cssRules.length);
        if (metaBook.user.twitterid) 
            ss.insertRule(
                "#METABOOKHUD span.twitter_share { display: inline;}",
                ss.cssRules.length);
        if (metaBook.user.linkedinid) 
            ss.insertRule(
                "#METABOOKHUD span.linkedin_share { display: inline;}",
                ss.cssRules.length);
        if (metaBook.user.googleid) 
            ss.insertRule(
                "#METABOOKHUD span.google_share { display: inline;}",
                ss.cssRules.length);
        var maker=fdjtDOM.getInput(form,"MAKER");
        if (maker) maker.value=metaBook.user._id;
        var pic=
            (metaBook.user._pic)||
            (metaBook.user.pic)||
            ((metaBook.user.fbid)&&
             ("https://graph.facebook.com/"+metaBook.user.fbid+
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
                idlink.href='https://auth.sbooks.net/my/profile';}}
        if (metaBook.user.friends) {
            var friends=metaBook.user.friends; var sourcedb=metaBook.sourcedb;
            i=0; lim=friends.length; while (i<lim) {
                var friend=RefDB.resolve(friends[i++],sourcedb);
                metaBook.addTag2Cloud(friend,metaBook.gloss_cloud);
                metaBook.addTag2Cloud(friend,metaBook.share_cloud);}}
        if (metaBook.outlets)
            metaBook.addOutlets2UI(metaBook.outlets);
        if (Trace.startup) {
            var now=fdjtTime();
            fdjtLog("Setup UI for %s (%s) in %dms",
                    metaBook.user._id,metaBook.user.name||metaBook.user.email,
                    now-startui);}
        metaBook._user_ui_setup=true;}
    metaBook.setupUI4User=setupUI4User;

    function loginUser(info){
        metaBook.user=metaBook.sourcedb.Import(
            info,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
        setupUI4User();
        metaBook._user_setup=false;}
    metaBook.loginUser=loginUser;
    
    function userSetup(){
        // Get any local sync information
        var sync=metaBook.sync=
            getLocal("mB("+metaBook.refuri+").sync",true)||0;
        var started=fdjtTime();
        var loadinfo=false, userinfo=false;

        // If the configuration is set to not persist, but there's
        //  a sync timestamp, we should erase what's there.
        if ((metaBook.sync)&&(!(metaBook.persist)))
            metaBook.clearOffline();

        if (metaBook.nologin) {}
        else if ((metaBook.persist)&&(getLocal("mB.user"))) {
            initUserOffline();
            if (Trace.storage) 
                fdjtLog("Local info for %o (%s) from %o",
                        metaBook.user._id,metaBook.user.name,metaBook.sync);
            // Clear any loadinfo read on startup from the
            // application cache but already stored locally.
            if ((metaBook.user)&&(metaBook.sync)&&(metaBook.cacheglosses)&&
                (window._sbook_loadinfo))
                // Clear the loadinfo "left over" from startup,
                //  which should now be in the database
                window._sbook_loadinfo=false;}
        
        if (metaBook.nologin) {}
        else if ((window._sbook_loadinfo)&&
                 (window._sbook_loadinfo.userinfo)) {
            // Get the userinfo from the loadinfo that might have already been loaded
            loadinfo=window._sbook_loadinfo;
            userinfo=loadinfo.userinfo;
            window._sbook_loadinfo=false;
            if (Trace.storage) 
                fdjtLog("Have window._sbook_loadinfo for %o (%s) dated %o: %j",
                        userinfo._id,userinfo.name||userinfo.email,
                        loadinfo.sync,userinfo);
            setUser(userinfo,
                    loadinfo.outlets,loadinfo.layers,
                    loadinfo.sync);
            if (loadinfo.nodeid) setNodeID(loadinfo.nodeid);}
        else if ((metaBook.userinfo)||(window._userinfo)) {
            userinfo=(metaBook.userinfo)||(window._userinfo);
            if ((Trace.storage)||(Trace.startup))
                fdjtLog("Have %s for %o (%s) dated %o: %j",
                        ((metaBook.userinfo)?("metaBook.userinfo"):("window._userinfo")),
                        userinfo._id,userinfo.name||userinfo.email,
                        userinfo.sync||userinfo.modified,userinfo);
            setUser(userinfo,userinfo.outlets,userinfo.layers,
                    userinfo.sync||userinfo.modified);}
        else {}
        if (Trace.startup>1)
            fdjtLog("userSetup done in %dms",fdjtTime()-started);
        if (metaBook.nologin) return;
        else if (!(metaBook.refuri)) return;
        else {}
        if (window.navigator.onLine) {
            if ((metaBook.user)&&(sync))
                fdjtLog("Requesting additional glosses (> %s (%d)) on %s from %s for %s",
                        fdjtTime.timeString(metaBook.sync),metaBook.sync,
                        metaBook.refuri,metaBook.server,metaBook.user._id,metaBook.user.name);
            else if (metaBook.user)
                fdjtLog("Requesting all glosses on %s from %s for %s (%s)",
                        metaBook.refuri,metaBook.server,metaBook.user._id,metaBook.user.name);
            else fdjtLog(
                "No user, requesting user info and glosses from %s",
                metaBook.server);
            metaBook.updateInfo();
            return;}
        else return;}
    metaBook.userSetup=userSetup;

    function initUserOffline(){
        var refuri=metaBook.refuri;
        var user=getLocal("mB.user");
        var sync=metaBook.sync;
        var nodeid=getLocal("mB("+refuri+").nodeid",true);
        // We store the information for the current user
        //  in both localStorage and in the "real" sourcedb.
        // We fetch the user from local storage because we
        //  can do that synchronously.
        var userinfo=user&&getLocal(user,true);
        if (Trace.storage)
            fdjtLog("initOffline user=%s sync=%s nodeid=%s info=%j",
                    user,sync,nodeid,userinfo);
        if (!(sync)) return;
        if (!(user)) return;
        if (Trace.startup>1)
            fdjtLog("initOffline userinfo=%j",userinfo);
        // Should these really be refs in sourcedb?
        var outlets=metaBook.outlets=
            (getLocal("mB("+refuri+").outlets",true)||[]).map(sourceref);
        var layers=metaBook.layers=
            (getLocal("mB("+refuri+").layers",true)||[]).map(sourceref);
        if (userinfo) setUser(userinfo,outlets,layers,sync);
        if (nodeid) setNodeID(nodeid);}
    metaBook.initUserOffline=initUserOffline;

    /* Setting up the clouds */
    
    function addOutlets2UI(outlet){
        if (typeof outlet === 'string')
            outlet=metaBook.sourcedb.ref(outlet);
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
            metaBook.share_cloud.addCompletion(completion);}
        outlet.onLoad(init,"addoutlet2cloud");}
    metaBook.addOutlets2UI=addOutlets2UI;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
