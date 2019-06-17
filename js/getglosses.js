/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/getglosses.js ###################### */

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

// getglosses.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtString=fdjt.String;
    var fdjtTime=fdjt.Time, $ID=fdjt.ID, fdjtAsync=fdjt.Async;
    var RefDB=fdjt.RefDB, fdjtState=fdjt.State, fdjtAjax=fdjt.Ajax;

    var dropClass=fdjtDOM.dropClass, addClass=fdjtDOM.addClass;
    
    var mR=metaReader, Trace=mR.Trace;

    var getQuery=fdjtState.getQuery;
    var getHash=fdjtState.getHash;

    var getLocal=fdjtState.getLocal;
    var saveLocal=metaReader.saveLocal;

    var setMyCopyId=mR.setMyCopyId;

    /* Loading meta info (user, glosses, etc) */

    function loadInfo(info) {
        if (metaReader.nouser) {
            metaReader.setConnected(false);
            return;}
        if (window._metareader_loadinfo!==info)
            metaReader.setConnected(true);
        if (info.sticky) metaReader.setPersist(true);
        if (info.mycopyid) setMyCopyId(info.mycopyid);
        else if (info.mycopy) setMyCopyId(info.mycopy);
        else {}
        if (!(metaReader.user)) {
            if (info.userinfo)
                metaReader.setUser(
                    info.userinfo,info.outlets,info.layers,
                    info.sync);
            else {
                if (getLocal("mR("+mR.docid+").queued"))
                    metaReader.glossdb.load(
                        getLocal("mR("+mR.docid+").queued",true));
                $ID("METABOOKCOVER").className="bookcover";
                addClass(document.documentElement||document.body,
                         "_NOUSER");}
            if (info.nodeid) metaReader.setNodeID(info.nodeid);}
        else if (info.wronguser) {
            metaReader.clearOffline();
            window.location=window.location.href;
            return;}
        else if ((info.userinfo)&&(metaReader.user)) {
            metaReader.user.importValue(info.userinfo);
            metaReader.user.save();
            metaReader.setupUI4User();}
        if (info.mycopyid) {
            if ((metaReader.mycopyid)&&
                (info.mycopyid!==metaReader.mycopyid))
                fdjtLog.warn("Mismatched mycopyids");
            if (info.mycopyid!==metaReader.mycopyid) {
                setMyCopyId(info.mycopyid);
                if (mR.iosAuthKludge) mR.iosAuthKludge();}}
        if (!(metaReader.docinfo)) { /* Scan not done */
            metaReader.scandone=function(){loadInfo(info);};
            return;}
        else if (info.loaded) return;
        if ((window._metareader_loadinfo)&&
            (window._metareader_loadinfo!==info)) {
            // This means that we have more information from the gloss
            // server before the local app has gotten around to
            // processing  the app-cached loadinfo.js
            // In this case, we put it in _sbook_new_loadinfo
            window._metareader_newinfo=info;
            return;}
        if ((metaReader.persist)&&(metaReader.cacheglosses)&&
            (info)&&(info.userinfo)&&(metaReader.user)&&
            (info.userinfo._id!==metaReader.user._id)) {
            metaReader.clearOffline();}
        info.loaded=fdjtTime();
        if ((!(metaReader.localglosses))&&
            ((getLocal("mR("+mR.docid+").sync"))||
             (getLocal("mR("+mR.docid+").queued"))))
            initGlossesOffline();
        if (Trace.glosses) {
            fdjtLog("loadInfo for %d %sglosses and %d refs (sync=%d)",
                    ((info.glosses)?(info.glosses.length):(0)),
                    ((metaReader.sync)?("updated "):("")),
                    ((info.etc)?(info.etc.length):(0)),
                    info.sync);
            fdjtLog("loadInfo got %d sources, %d outlets, and %d layers",
                    ((info.sources)?(info.sources.length):(0)),
                    ((info.outlets)?(info.outlets.length):(0)),
                    ((info.layers)?(info.layers.length):(0)));}
        if ((info.glosses)||(info.etc))
            initGlosses(info.glosses||[],info.etc||[],
                        function(){infoLoaded(info);});}
    metaReader.loadInfo=loadInfo;

    function infoLoaded(info){
        var keepdata=(metaReader.cacheglosses);
        if (info.etc) gotInfo("etc",info.etc,keepdata);
        if (info.sources) gotInfo("sources",info.sources,keepdata);
        if (info.outlets) gotInfo("outlets",info.outlets,keepdata);
        if (info.layers) gotInfo("layers",info.layers,keepdata);
        if (info.mycopyid) setMyCopyId(info.mycopyid,"loadinfo");
        metaReader.addOutlets2UI(info.outlets);
        if ((info.sync)&&((!(metaReader.sync))||(info.sync>=metaReader.sync))) {
            metaReader.setSync(info.sync);}
        metaReader.loaded=info.loaded=fdjtTime();
        if (metaReader.slices.allglosses)
            metaReader.slices.allglosses.update();
        if (metaReader.whenloaded) {
            var whenloaded=metaReader.whenloaded;
            metaReader.whenloaded=false;
            setTimeout(whenloaded,10);}
        if (keepdata) {
            metaReader.glossdb.save(true);
            metaReader.sourcedb.save(true);}
        if (metaReader.glosshash) {
            if (metaReader.showGloss(metaReader.glosshash))
                metaReader.glosshash=false;}}

    var updating=false;
    var noajax=false;
    function updatedInfo(data,source,start){
        var user=metaReader.user;
        if ((Trace.network)||
            ((Trace.glosses)&&(data.glosses)&&(data.glosses.length))||
            ((Trace.startup)&&
             ((!(user))||
              ((metaReader.update_interval)&&
               (!(metaReader.ticktock))&&
               (Trace.startup))))) {
            if (start)
                fdjtLog("Response (%dms) from %s",
                        fdjtTime()-start,source||metaReader.server);
            else fdjtLog("Response from %s",source||metaReader.server);}
        updating=false; loadInfo(data);
        if ((!(user))&&(metaReader.user)) metaReader.userSetup();
        else if (metaReader._ui_setup) metaReader.setupUI4User();}
    metaReader.updatedInfo=updatedInfo;
    function updateInfo(callback,jsonp){
        var user=metaReader.user; var start=fdjtTime();
        var uri="https://"+metaReader.server+"/v1/loadinfo.js?";
        var ajax_headers=((metaReader.sync)?({}):(false));
        if (mR.docref)
            uri=uri+"DOC="+encodeURIComponent(mR.docref);
        else uri=uri+"REFURI="+encodeURIComponent(mR.refuri);
        if (mR.sync) {
            ajax_headers["If-Modified-Since"]=
                ((new Date(metaReader.sync*1000)).toString());}
        function gotInfo(req){
            updating=false;
            var response=JSON.parse(req.responseText);
            if ((response.glosses)&&(response.glosses.length))
                fdjtLog("Received %d glosses from the server",
                        response.glosses.length);
            metaReader.updatedInfo(
                response,
                uri+((user)?("&SYNCUSER="+user._id):("&JUSTUSER=yes")),
                start);
            if (user) {
                // If there was already a user, just startup
                //  regular updates now
                if ((!(metaReader.ticktock))&&(metaReader.update_interval)) 
                    metaReader.ticktock=setInterval(
                        updateInfo,metaReader.update_interval*1000);}
            else if (metaReader.user)
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
                if (metaReader.ticktock) {
                    clearInterval(metaReader.ticktock);
                    metaReader.ticktock=false;}
                setTimeout(updateInfo,metaReader.update_pause);}}
        if ((updating)||(!(navigator.onLine))) return; 
        else updating=true;
        // Get any requested glosses and add them to the call
        var i=0, lim, glosses=getQuery("GLOSS",true); {
            i=0; lim=glosses.length; while (i<lim)
                uri=uri+"&GLOSS="+glosses[i++];}
        glosses=getHash("GLOSS"); {
            i=0; lim=glosses.length; while (i<lim) 
                uri=uri+"&GLOSS="+glosses[i++];}
        if (metaReader.mycopyid)
            uri=uri+"&MYCOPYID="+encodeURIComponent(metaReader.mycopyid);
        if (metaReader.sync) uri=uri+"&SYNC="+(metaReader.sync+1);
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
                       {timeout: metaReader.update_timeout});}
        catch (ex) {
            fdjtLog.warn(
                "Ajax call to %s failed, falling back to JSONP",uri);
            updateInfoJSONP(uri);}}
    metaReader.updateInfo=updateInfo;
    function updatedInfoJSONP(data){
        var elt=$ID("METABOOKUPDATEINFO");
        metaReader.updatedInfo(data,(((elt)&&(elt.src))||"JSON"));}
    metaReader.updatedInfoJSONP=updatedInfoJSONP;
    function updateInfoJSONP(uri,callback){
        if (!(navigator.onLine)) return;
        if (!(callback)) callback="metaReader.updatedInfoJSONP";
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
        if (metaReader.mycopyid)
            update_script.setAttribute("crossorigin","anonymous");
        else update_script.setAttribute("crossorigin","use-credentials");
        update_script.src=uri;
        if (elt) fdjtDOM.replace(elt,update_script);
        else document.body.appendChild(update_script);}

    function gotItem(item,qids){
        if (typeof item === 'string') {
            var load_ref=metaReader.sourcedb.ref(item);
            if (metaReader.persist) load_ref.load();
            qids.push(load_ref._id);}
        else {
            var import_ref=metaReader.sourcedb.Import(
                item,false,
                RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
            import_ref.save();
            qids.push(import_ref._id);}}
    function saveItems(qids,name){
        metaReader[name]=qids;
        if (metaReader.cacheglosses) saveLocal(
            "mR"+"("+mR.docid+")."+name,qids,true);}
    
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
                var ref=metaReader.sourcedb.Import(
                    info,false,
                    RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
                if (persist) ref.save();
                metaReader[name]=ref._id;
                if (persist) saveLocal(
                    "mR"+"("+mR.docid+")."+name,ref._id,true);}}}

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
        metaReader.sourcedb.Import(
            etc,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,true);
        metaReader.glossdb.Import(
            glosses,{"tags": Knodule.importTagSlot},
            RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,
            callback);
        var i=0; var lim=glosses.length;
        var latest=metaReader.syncstamp||0;
        while (i<lim) {
            var gloss=glosses[i++];
            var tstamp=gloss.syncstamp||gloss.tstamp;
            if (tstamp>latest) latest=tstamp;}
        metaReader.syncstamp=latest;
        if (glosses.length)
            fdjtLog("Assimilated %d new glosses in %dms...",
                    glosses.length,fdjtTime()-start);
        dropClass(msg,"running");}
    metaReader.initGlosses=initGlosses;
    
    function go_online(){return offline_update();}
    function offline_update(){
        metaReader.writeQueuedGlosses(); updateInfo();}
    metaReader.update=offline_update;
    
    fdjtDOM.addListener(window,"online",go_online);

    metaReader.addConfig("glossupdate",function(name,value){
        metaReader.update_interval=value;
        if (metaReader.ticktock) {
            clearInterval(metaReader.ticktock);
            metaReader.ticktock=false;
            if (value) metaReader.ticktock=
                setInterval(updateInfo,value*1000);}});
    metaReader.addConfig("updatetimeout",function(name,value){
        metaReader.update_timeout=value;});
    metaReader.addConfig("updatepause",function(name,value){
        metaReader.update_pause=value;});

    var offline_init=false;

    function initGlossesOffline(){
        if (offline_init) return false;
        else offline_init=true;
        var sync=metaReader.sync;
        if (!(sync)) return;
        if ((Trace.glosses)||(Trace.startup))
            fdjtLog("Starting initializing glosses from local storage");
        metaReader.sourcedb.load(true);
        var loading=metaReader.glossdb.load(true);
        if (loading) 
            loading.then(function(){
                if ((metaReader.glossdb.allrefs.length)||
                    (metaReader.sourcedb.allrefs.length))
                    fdjtLog("Initialized %d glosses (%d sources) from local storage",
                            metaReader.glossdb.allrefs.length,
                            metaReader.sourcedb.allrefs.length);});}
    metaReader.initGlossesOffline=initGlossesOffline;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
