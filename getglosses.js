/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/getglosses.js ###################### */

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
/* globals Promise */

// getglosses.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtString=fdjt.String;
    var fdjtTime=fdjt.Time, $ID=fdjt.ID, fdjtAsync=fdjt.Async;
    var RefDB=fdjt.RefDB, fdjtState=fdjt.State, fdjtAjax=fdjt.Ajax;

    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    
    var mB=metaBook, Trace=mB.Trace;

    var getQuery=fdjtState.getQuery;
    var getHash=fdjtState.getHash;

    var getLocal=fdjtState.getLocal;
    var saveLocal=metaBook.saveLocal;

    /* Loading meta info (user, glosses, etc) */

    function loadInfo(info) {
        if (metaBook.nouser) {
            metaBook.setConnected(false);
            return;}
        if (window._sbook_loadinfo!==info)
            metaBook.setConnected(true);
        if (info.sticky) metaBook.setPersist(true);
        if (info.mycopyid) gotMyCopyId(info.mycopyid);
        else if (info.mycopy) gotMyCopyId(info.mycopy);
        else {}
        if (!(metaBook.user)) {
            if (info.userinfo)
                metaBook.setUser(
                    info.userinfo,info.outlets,info.layers,
                    info.sync);
            else {
                if (getLocal("mB("+mB.docid+").queued"))
                    metaBook.glossdb.load(
                        getLocal("mB("+mB.docid+").queued",true));
                $ID("METABOOKCOVER").className="bookcover";
                addClass(document.documentElement||document.body,
                         "_NOUSER");}
            if (info.nodeid) metaBook.setNodeID(info.nodeid);}
        else if (info.wronguser) {
            metaBook.clearOffline();
            window.location=window.location.href;
            return;}
        else if ((info.userinfo)&&(metaBook.user)) {
            metaBook.user.importValue(info.userinfo);
            metaBook.user.save();
            metaBook.setupUI4User();}
        if (info.mycopyid) {
            if ((metaBook.mycopyid)&&
                (info.mycopyid!==metaBook.mycopyid))
                fdjtLog.warn("Mismatched mycopyids");
            if (info.mycopyid!==metaBook.mycopyid) {
                metaBook.mycopyid=info.mycopyid;
                if (mB.iosAuthKludge) mB.iosAuthKludge();}}
        if (!(metaBook.docinfo)) { /* Scan not done */
            metaBook.scandone=function(){loadInfo(info);};
            return;}
        else if (info.loaded) return;
        if ((window._sbook_loadinfo)&&
            (window._sbook_loadinfo!==info)) {
            // This means that we have more information from the gloss
            // server before the local app has gotten around to
            // processing  the app-cached loadinfo.js
            // In this case, we put it in _sbook_new_loadinfo
            window._sbook_newinfo=info;
            return;}
        if ((metaBook.persist)&&(metaBook.cacheglosses)&&
            (info)&&(info.userinfo)&&(metaBook.user)&&
            (info.userinfo._id!==metaBook.user._id)) {
            metaBook.clearOffline();}
        info.loaded=fdjtTime();
        if ((!(metaBook.localglosses))&&
            ((getLocal("mB("+mB.docid+").sync"))||
             (getLocal("mB("+mB.docid+").queued"))))
            initGlossesOffline();
        if (Trace.glosses) {
            fdjtLog("loadInfo for %d %sglosses and %d refs (sync=%d)",
                    ((info.glosses)?(info.glosses.length):(0)),
                    ((metaBook.sync)?("updated "):("")),
                    ((info.etc)?(info.etc.length):(0)),
                    info.sync);
            fdjtLog("loadInfo got %d sources, %d outlets, and %d layers",
                    ((info.sources)?(info.sources.length):(0)),
                    ((info.outlets)?(info.outlets.length):(0)),
                    ((info.layers)?(info.layers.length):(0)));}
        if ((info.glosses)||(info.etc))
            initGlosses(info.glosses||[],info.etc||[],
                        function(){infoLoaded(info);});}
    metaBook.loadInfo=loadInfo;

    function infoLoaded(info){
        var keepdata=(metaBook.cacheglosses);
        if (info.etc) gotInfo("etc",info.etc,keepdata);
        if (info.sources) gotInfo("sources",info.sources,keepdata);
        if (info.outlets) gotInfo("outlets",info.outlets,keepdata);
        if (info.layers) gotInfo("layers",info.layers,keepdata);
        if (info.mycopyid) gotMyCopyId(info.mycopyid);
        metaBook.addOutlets2UI(info.outlets);
        if ((info.sync)&&((!(metaBook.sync))||(info.sync>=metaBook.sync))) {
            metaBook.setSync(info.sync);}
        metaBook.loaded=info.loaded=fdjtTime();
        if (metaBook.slices.allglosses)
            metaBook.slices.allglosses.update();
        if (metaBook.whenloaded) {
            var whenloaded=metaBook.whenloaded;
            metaBook.whenloaded=false;
            setTimeout(whenloaded,10);}
        if (keepdata) {
            metaBook.glossdb.save(true);
            metaBook.sourcedb.save(true);}
        if (metaBook.glosshash) {
            if (metaBook.showGloss(metaBook.glosshash))
                metaBook.glosshash=false;}}

    var updating=false;
    var noajax=false;
    function updatedInfo(data,source,start){
        var user=metaBook.user;
        if ((Trace.network)||
            ((Trace.glosses)&&(data.glosses)&&(data.glosses.length))||
            ((Trace.startup)&&
             ((!(user))||
              ((metaBook.update_interval)&&
               (!(metaBook.ticktock))&&
               (Trace.startup))))) {
            if (start)
                fdjtLog("Response (%dms) from %s",
                        fdjtTime()-start,source||metaBook.server);
            else fdjtLog("Response from %s",source||metaBook.server);}
        updating=false; loadInfo(data);
        if ((!(user))&&(metaBook.user)) metaBook.userSetup();
        else if (metaBook._ui_setup) metaBook.setupUI4User();}
    metaBook.updatedInfo=updatedInfo;
    function updateInfo(callback,jsonp){
        var user=metaBook.user; var start=fdjtTime();
        var uri="https://"+metaBook.server+"/v1/loadinfo.js?REFURI="+
            encodeURIComponent(metaBook.refuri);
        var ajax_headers=((metaBook.sync)?({}):(false));
        if (metaBook.sync)
            ajax_headers["If-Modified-Since"]=
            ((new Date(metaBook.sync*1000)).toString());
        function gotInfo(req){
            updating=false;
            var response=JSON.parse(req.responseText);
            if ((response.glosses)&&(response.glosses.length))
                fdjtLog("Received %d glosses from the server",
                        response.glosses.length);
            metaBook.updatedInfo(
                response,
                uri+((user)?("&SYNCUSER="+user._id):("&JUSTUSER=yes")),
                start);
            if (user) {
                // If there was already a user, just startup
                //  regular updates now
                if ((!(metaBook.ticktock))&&(metaBook.update_interval)) 
                    metaBook.ticktock=setInterval(
                        updateInfo,metaBook.update_interval*1000);}
            else if (metaBook.user)
                // This response gave us a user, so we start
                //  another request, which will get glosses.  The
                //  response to this request will start the
                //  interval timer.
                setTimeout(updateInfo,50);
            else {
                // The response back didn't give us any user information
                fdjtLog.warn("Couldn't determine user!");}}
        function ajaxFailed(req){
            if ((req.readyState===4)&&(req.status<500)) {
                fdjtLog.warn(
                    "Ajax to %s callback failed, falling back to JSONP",
                    uri);
                updateInfoJSONP(uri+((user)?(""):("&JUSTUSER=yes")),jsonp);
                noajax=true;}
            else if (req.readyState===4) {
                try {
                    fdjtLog.warn(
                        "Ajax to %s returned %d %j, taking a break",
                        uri,req.status,JSON.parse(req.responseText));}
                catch (ex) {
                    fdjtLog.warn(
                        "Ajax to %s returned %d, taking a break",
                        uri,req.status);}
                if (metaBook.ticktock) {
                    clearInterval(metaBook.ticktock);
                    metaBook.ticktock=false;}
                setTimeout(updateInfo,metaBook.update_pause);}}
        if ((updating)||(!(navigator.onLine))) return; 
        else updating=true;
        // Get any requested glosses and add them to the call
        var i=0, lim, glosses=getQuery("GLOSS",true); {
            i=0; lim=glosses.length; while (i<lim)
                uri=uri+"&GLOSS="+glosses[i++];}
        glosses=getHash("GLOSS"); {
            i=0; lim=glosses.length; while (i<lim) 
                uri=uri+"&GLOSS="+glosses[i++];}
        if (metaBook.mycopyid)
            uri=uri+"&MYCOPYID="+encodeURIComponent(metaBook.mycopyid);
        if (metaBook.sync) uri=uri+"&SYNC="+(metaBook.sync+1);
        if (user) uri=uri+"&SYNCUSER="+user._id;
        if ((!(user))&&(Trace.startup))
            fdjtLog("Requesting initial user info with %s using %s",
                    ((noajax)?("JSONP"):("Ajax")),uri);
        if (noajax) {
            updateInfoJSONP(uri+((user)?(""):("&JUSTUSER=yes")),jsonp);
            return;}
        try { fdjtAjax(gotInfo,
                       uri+"&CALLBACK=return"+((user)?(""):("&JUSTUSER=yes")),[],
                       ajaxFailed,
                       ajax_headers,
                       {timeout: metaBook.update_timeout});}
        catch (ex) {
            fdjtLog.warn(
                "Ajax call to %s failed, falling back to JSONP",uri);
            updateInfoJSONP(uri);}}
    metaBook.updateInfo=updateInfo;
    function updatedInfoJSONP(data){
        var elt=$ID("METABOOKUPDATEINFO");
        metaBook.updatedInfo(data,(((elt)&&(elt.src))||"JSON"));}
    metaBook.updatedInfoJSONP=updatedInfoJSONP;
    function updateInfoJSONP(uri,callback){
        if (!(navigator.onLine)) return;
        if (!(callback)) callback="metaBook.updatedInfoJSONP";
        var elt=$ID("METABOOKUPDATEINFO");
        if (uri.indexOf('?')>0) {
            if (uri[uri.length-1]!=='&') uri=uri+"&";}
        else uri=uri+"?";
        uri=uri+"CALLBACK="+callback;
        var update_script=fdjtDOM("script#METABOOKUPDATEINFO");
        update_script.language="javascript";
        update_script.type="text/javascript";
        update_script.setAttribute("charset","utf-8");
        update_script.setAttribute("async","async");
        if (metaBook.mycopyid)
            update_script.setAttribute("crossorigin","anonymous");
        else update_script.setAttribute("crossorigin","use-credentials");
        update_script.src=uri;
        if (elt) fdjtDOM.replace(elt,update_script);
        else document.body.appendChild(update_script);}

    function gotItem(item,qids){
        if (typeof item === 'string') {
            var load_ref=metaBook.sourcedb.ref(item);
            if (metaBook.persist) load_ref.load();
            qids.push(load_ref._id);}
        else {
            var import_ref=metaBook.sourcedb.Import(
                item,false,
                RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
            import_ref.save();
            qids.push(import_ref._id);}}
    function saveItems(qids,name){
        metaBook[name]=qids;
        if (metaBook.cacheglosses) saveLocal(
            "mB"+"("+mB.docid+")."+name,qids,true);}
    
    // Processes loaded info asynchronously
    function gotInfo(name,info,persist) {
        if (info) {
            if (info instanceof Array) {
                var qids=[];
                if (info.length<7) {
                    var i=0; var lim=info.length; 
                    while (i<lim) gotItem(info[i++],qids);
                    saveItems(qids,name);}
                else fdjtAsync.slowmap(
                    function(item){gotItem(item,qids);},
                    info,{done: function(){saveItems(qids,name);}});}
            else {
                var ref=metaBook.sourcedb.Import(
                    info,false,
                    RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
                if (persist) ref.save();
                metaBook[name]=ref._id;
                if (persist) saveLocal(
                    "mB"+"("+mB.docid+")."+name,ref._id,true);}}}

    function initGlosses(glosses,etc,callback){
        if (typeof callback === "undefined") callback=true;
        if ((glosses.length===0)&&(etc.length===0)) return;
        var msg=$ID("METABOOKNEWGLOSSES");
        var start=fdjtTime();
        if (msg) {
            msg.innerHTML=fdjtString(
                "Assimilating %d new glosses",glosses.length);
            addClass(msg,"running");}
        if (etc) {
            if (glosses.length)
                fdjtLog("Assimilating %d new glosses/%d sources...",
                        glosses.length,etc.length);}
        else if ((glosses.length)&&(Trace.glosses)) 
            fdjtLog("Assimilating %d new glosses...",glosses.length);
        else {}
        metaBook.sourcedb.Import(
            etc,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,true);
        metaBook.glossdb.Import(
            glosses,{"tags": Knodule.importTagSlot},
            RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,
            callback);
        var i=0; var lim=glosses.length;
        var latest=metaBook.syncstamp||0;
        while (i<lim) {
            var gloss=glosses[i++];
            var tstamp=gloss.syncstamp||gloss.tstamp;
            if (tstamp>latest) latest=tstamp;}
        metaBook.syncstamp=latest;
        if (glosses.length)
            fdjtLog("Assimilated %d new glosses in %dms...",
                    glosses.length,fdjtTime()-start);
        dropClass(msg,"running");}
    metaBook.initGlosses=initGlosses;
    
    function go_online(){return offline_update();}
    function offline_update(){
        metaBook.writeQueuedGlosses(); updateInfo();}
    metaBook.update=offline_update;
    
    fdjtDOM.addListener(window,"online",go_online);

    metaBook.addConfig("glossupdate",function(name,value){
        metaBook.update_interval=value;
        if (metaBook.ticktock) {
            clearInterval(metaBook.ticktock);
            metaBook.ticktock=false;
            if (value) metaBook.ticktock=
                setInterval(updateInfo,value*1000);}});
    metaBook.addConfig("updatetimeout",function(name,value){
        metaBook.update_timeout=value;});
    metaBook.addConfig("updatepause",function(name,value){
        metaBook.update_pause=value;});

    var offline_init=false;

    function initGlossesOffline(){
        if (offline_init) return false;
        else offline_init=true;
        var sync=metaBook.sync;
        if (!(sync)) return;
        if ((Trace.glosses)||(Trace.startup))
            fdjtLog("Starting initializing glosses from local storage");
        metaBook.sourcedb.load(true);
        var loading=metaBook.glossdb.load(true);
        if (loading) 
            loading.then(function(){
                if ((metaBook.glossdb.allrefs.length)||
                    (metaBook.sourcedb.allrefs.length))
                    fdjtLog("Initialized %d glosses (%d sources) from local storage",
                            metaBook.glossdb.allrefs.length,
                            metaBook.sourcedb.allrefs.length);});}
    metaBook.initGlossesOffline=initGlossesOffline;

    var need_mycopyid=[];

    function gotMyCopyId(string){
        function mycopyidupdate(resolve){
            if (!(string)) return resolve(string);
            if (string===mB.mycopyid) return resolve(string);
            var tickmatch=/:x(\d+)/.exec(string);
            var tick=(tickmatch)&&(tickmatch.length>1)&&(parseInt(tickmatch[1]));
            var expires=(tick)&&(new Date(tick*1000));
            if ((Trace.glosses>1)||(Trace.glossdata))
                fdjtLog("gotMyCopyId: %s/%s, cur=%s/%s",
                        string,expires,metaBook.mycopyid,metaBook.mycopyid_expires);
            if (!(expires)) {
                metaBook.umycopyid=string;
                metaBook.saveLocal("umycopyid("+mB.docuri+")",string);}
            if ((!(metaBook.mycopyid))||
                ((!(metaBook.mycopyid_expires))&&(expires))||
                ((metaBook.mycopyid_expires)&&(expires)&&
                 (expires>metaBook.mycopyid_expires))) {
                metaBook.mycopyid=string; metaBook.mycopyid_expires=expires;
                metaBook.saveLocal("mycopyid("+mB.docuri+")",string);
                if (mB.iosAuthKludge) mB.iosAuthKludge();}
            else {}
            if ((need_mycopyid)&&(need_mycopyid.length)) {
                var needs=need_mycopyid; need_mycopyid=[];
                return fdjtAsync.slowmap(function(fn){fn(string);},needs).
                    then(function(){resolve(string);});}
            else return resolve(string);}
        return new Promise(mycopyidupdate);}
    metaBook.gotMyCopyId=gotMyCopyId;

    var getting_mycopyid=false;

    function getMyCopyId(){
        function updatemycopyid(resolved){
            var now=new Date();
            if ((mB.mycopyid)&&(mB.mycopyid_expires>now))
                return resolved(mB.mycopyid);
            else if (!(getting_mycopyid)) getFreshMyCopyId();
            need_mycopyid.push(resolved);}
        return new Promise(updatemycopyid);}
    metaBook.getMyCopyId=getMyCopyId;

    function getFreshMyCopyId(){
        if (getting_mycopyid) return;
        getting_mycopyid=fdjtTime();
        fdjtAjax.fetchText("https://auth.bookhub.io/getmycopyid?DOC="+mB.docref).
            then(function(mycopyid){
                gotMyCopyId(mycopyid).then(function(){getting_mycopyid=false;});});}

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
