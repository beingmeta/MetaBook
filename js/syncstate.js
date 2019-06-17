/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metareader/syncstate.js ###################### */

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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtState=fdjt.State;
    var fdjtLog=fdjt.Log, fdjtUI=fdjt.UI, fdjtTime=fdjt.Time;
    var $ID=fdjt.ID;
    var mR=metaReader, mbID=mR.ID;
    var saveLocal=mR.saveLocal, readLocal=mR.readLocal;
    var clearLocal=mR.clearLocal;
    var Trace=metaReader.Trace;
    var loc2pct=metaReader.location2pct;
    var sync_count=0;

    var setTarget, setConnected, setConfig;
    function init_local(){
        setTarget=metaReader.setTarget;
        setConnected=metaReader.setConnected;
        setConfig=metaReader.setConfig;}
    metaReader.inits.local.push(init_local);

    /* Managing the reader state */

    /* Three aspects of the reading state are saved:

     * the numeric location within the book (in characters from the
     beginning)
     * the most recent target ID
     * the current page (just for messages, since page numbers aren't
     stable
    */

    // We keep track of the current state and the last time that state
    // was changed by a user action.  Restoring a saved state, for
    // example, doesn't bump the change date.

    var syncing=false;
    
    // This initializes the reading state, either from local storage
    //  or the initial hash id from the URL (which was saved in
    //  metaReader.inithash).
    metaReader.initState=function initState() {
        var state=readLocal("mR("+mR.docid+").state",true);
        var hash=metaReader.inithash;
        if (hash) {
            if (hash[0]==="#") hash=hash.slice(1);}
        else hash=false;
        var elt=((hash)&&(mbID(hash)));
        if (elt) {
            // If the hash has changed, we take that as a user action
            //  and update the state.  If it hasn't changed, we assume
            //  that the stored state is still current and dated whenever
            //  it was last changed.
            if ((!(state))||
                ((state.hash)&&(state.hash!==hash))||
                ((!(state.hash))&&(state.target)&&(state.target!==hash))) {
                if (!(state)) state={};
                // Hash changed
                state.refuri=mR.refuri;
                state.docuri=mR.docuri;
                state.target=hash;
                state.location=false;
                state.changed=fdjtTime.tick();
                saveLocal("mR("+mR.docid+").state",state,true);}}
        else if ((hash)&&(hash.search("MBLOC")===0)) {
            var loc=parseInt(hash.slice(5));
            if ((!(state))||(state.location!==loc)) {
                state={refuri: mR.refuri, docuri: mR.docuri,
                       location: loc, change: fdjtTime.tick()};
                saveLocal("mR("+mR.docid+").state",state,true);}}
        if (state) metaReader.state=state;};
    
    // This records the current state of the app, bundled into an
    //  object. It primarily consists a location, a target, and
    //  the time it was last changed.
    // Mechanically, this procedure fills things out and stores the object
    //  in both metaReader.state and local/session storage.  If the changed
    //  date is later than the current metaReader.xstate, it also does
    //  an Ajax call to update the server.
    // Finally, unless skiphist is true, it updates the browser
    //  history to get the browser button to be useful.
    function saveState(state,skiphist,force){
        if ((!force)&&(state)&&
            ((metaReader.state===state)||
             ((metaReader.state)&&
              (metaReader.state.target===state.target)&&
              (metaReader.state.location===state.location)&&
              (metaReader.state.page===state.page))))
            return;
        if (!(state)) state=metaReader.state;
        if (!(state.changed)) state.changed=fdjtTime.tick();
        if (!(state.refuri)) state.refuri=metaReader.refuri;
        if (!(state.docuri)) state.docuri=metaReader.docuri;
        var title=state.title, frag=state.target;
        if ((!(title))&&(frag)&&(metaReader.docinfo)&&
            (metaReader.docinfo[frag])) {
            state.title=title=metaReader.docinfo[frag].title||
                metaReader.docinfo[frag].head.title;}
        if (Trace.state) fdjtLog("Setting state to %j",state);
        if ((state.maxloc)&&(state.maxloc<state.location))
            state.maxloc=state.location;
        else if (!(state.maxloc)) state.maxloc=state.location;
        if ((window)&&(window.location)&&(window.location.hash)) {
            var hash=window.location.hash;
            if (hash[0]==='#') hash=hash.slice(1);
            state.hash=hash;}
        if (Trace.state)
            fdjtLog("saveState skiphist=%o force=%o state=%j",
                    skiphist,force,state);
        if ((!(syncing))&&(metaReader.locsync)&&(metaReader.user)&&
            ((!(metaReader.xstate))||(state.changed>metaReader.xstate.changed)))
            syncState(true);
        if ((!(skiphist))&&(frag)&&
            (window.history)&&(window.history.pushState))
            setHistory(state,frag,title);
        saveStateLocal(state);
    } metaReader.saveState=saveState;

    function saveStateLocal(state){
        metaReader.state=state;
        var statestring=JSON.stringify(state);
        saveLocal("mR("+mR.docid+").state",statestring);
    } metaReader.saveStateLocal=saveStateLocal;


    // This sets the browser history from a particular state
    function setHistory(state,hash,title){
        if (Trace.state) {
            if (title)
                fdjtLog("setHistory %s (%s) state=%j",hash,title,state);
            else fdjtLog("setHistory %s state=%j",hash,state);}
        if (!((window.history)&&(window.history.pushState))) return;
        if (!(hash)) hash=state.target;
        if (!(title)) title=state.title;
        var href=fdjtState.getURL();
        if ((!(title))&&(hash)&&(metaReader.docinfo)&&
            (metaReader.docinfo[hash])) {
            state.title=title=metaReader.docinfo[hash].title||
                metaReader.docinfo[hash].head.title;}
        if ((!(hash))&&(state.location)&&
            (typeof state.location === "number"))
            hash="MBLOC"+state.location;
        if (Trace.state)
            fdjtLog("Pushing history %j %s (%s) '%s'",
                    state,href,title);
        if ((!(window.history.state))||
            (window.history.state.target!==state.target)||
            (window.history.state.location!==state.location)) {
            if (hash)
                window.history.pushState(state,title,href+"#"+hash);
            else window.history.pushState(state,title,href);}
    }
    metaReader.setHistory=setHistory;

    function restoreState(state,reason,savehist){
        if (Trace.state) fdjtLog("Restoring (%s) state %j",reason,state);
        if (state.location)
            metaReader.GoTo(state.location,reason||"restoreState",
                          ((state.target)?(mbID(state.target)):(false)),
                          false,(!(savehist)));
        else if ((state.page)&&(metaReader.layout)) {
            metaReader.GoToPage(state.page,reason||"restoreState",
                              false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        else if (state.target) {
            metaReader.GoTo(state.target,reason||"restoreState",
                          true,false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        if (!(state.refuri)) state.refuri=metaReader.refuri;
        if (!(state.docuri)) state.docuri=metaReader.docuri;
        saveStateLocal(state);
    } metaReader.restoreState=restoreState;

    function clearState(){
        metaReader.state=false;
        clearLocal("mR("+mR.docid+").state");
        metaReader.xstate=false;
    } metaReader.clearState=clearState;

    function resetState(){
        var state=metaReader.state;
        if (state.location) state.maxloc=location;
        state.reset=true;
        var statestring=JSON.stringify(state);
        saveLocal("mR("+mR.docid+").state",statestring);
        syncState(true);}
    metaReader.resetState=resetState;

    var sync_req=false, sync_wait=false, last_sync=false;
    // Post the current state and update synced state from what's
    // returned
    function syncState(force){
        var mycopyid=mR.mycopyid||mR.readMyCopyId();
        var elapsed=(last_sync)?(fdjtTime.tick()-last_sync):(3600*24*365*10);
        if ((syncing)||((!(force))&&(!(metaReader.locsync)))) return;
        if (!(metaReader.user)) return;
        if (sync_req) {
            fdjtLog("Skipping state sync because one is already in process");
            if (sync_wait) clearTimeout(sync_wait);
            setTimeout(((force)?(forceSyncState):(syncState)),15000);
            return;}
        if ((!(force))&&(elapsed<metaReader.sync_interval)) {
            if (Trace.state)
                fdjtLog("Skipping state sync because it's too soon");
            return;}
        if ((!(force))&&(metaReader.state)&&
            ((!(fdjtDOM.isHidden))||(document[fdjtDOM.isHidden]))&&
            (elapsed<(5*metaReader.sync_interval))) {
            if (Trace.state)
                fdjtLog("Skipping state sync because page is hidden");
            return;}
        if ((!(force))&&(elapsed<(metaReader.sync_min))) {
            sync_wait=setTimeout(((force)?(forceSyncState):(syncState)),
                                 metaReader.sync_min);
            return;}
        else if (sync_wait) {clearTimeout(sync_wait); sync_wait=false;} 
        if (((force)||(metaReader.locsync))&&(navigator.onLine)) {
            var uri=metaReader.docuri;
            var traced=(Trace.state)||(Trace.network);
            var state=metaReader.state;
            var refuri=
                ((metaReader.target)&&(metaReader.getRefURI(metaReader.target)))||
                (metaReader.refuri);
            var sync_uri="https://sync.bookhub.io/v1/sync?";
            if (mR.docref)
                sync_uri=sync_uri+"DOC="+encodeURIComponent(mR.docref);
            else sync_uri=sync_uri+"REFURI="+encodeURIComponent(refuri);
            if (mR.docuri!==refuri)
                sync_uri=sync_uri+"&DOCURI="+encodeURIComponent(metaReader.docuri);
            sync_uri=sync_uri+"&NOW="+fdjtTime.tick();
            metaReader.last_sync=last_sync=fdjtTime.tick(); 
            if (state) syncing=state; else syncing={};
            if (metaReader.user) sync_uri=sync_uri+
                "&SYNCUSER="+encodeURIComponent(metaReader.user._id);
            if (mycopyid) sync_uri=sync_uri+
                "&MYCOPYID="+encodeURIComponent(mycopyid);
            if (metaReader.deviceName) sync_uri=sync_uri+
                "&DEVICE="+encodeURIComponent(metaReader.deviceName);
            if (metaReader.ends_at) sync_uri=sync_uri+
                "&LOCLEN="+encodeURIComponent(metaReader.ends_at);
            if (state) {
                if (state.target) sync_uri=sync_uri+
                    "&TARGET="+encodeURIComponent(state.target);
                if (typeof state.location === "number")
                    sync_uri=sync_uri+
                    "&LOCATION="+encodeURIComponent(state.location);
                if (state.changed) sync_uri=sync_uri+
                    "&CHANGED="+encodeURIComponent(state.changed);
                if (state.reset) sync_uri=sync_uri+"&RESET=true";}
            var req=new XMLHttpRequest();
            req.onreadystatechange=freshState;
            req.ontimeout=syncTimeout;
            req.withCredentials=true;
            req.timeout=metaReader.sync_timeout;
            if (traced) fdjtLog("syncState(call) %s",sync_uri);
            try {
                req.open("GET",sync_uri,true);
                req.send();
                sync_req=req;}
            catch (ex) {
                try {
                    fdjtLog.warn(
                        "Sync request %s returned status %d %j, pausing for %ds",
                        uri,req.status,JSON.parse(req.responseText),
                        metaReader.sync_pause);}
                catch (err) {
                    fdjtLog.warn(
                        "Sync request %s returned status %d, pausing for %ds",
                        uri,req.status,metaReader.sync_pause/1000);}
                metaReader.locsync=false;
                setTimeout(startLocSync,metaReader.sync_pause);}}
    } metaReader.syncState=syncState;
    function forceSyncState(){syncState(true);}
    function startLocSync(){metaReader.locsync=true;}

    function syncTimeout(evt){
        evt=evt||window.event;
        fdjtLog.warn("Sync request timed out, pausing for %ds",
                     metaReader.sync_pause/1000);
        metaReader.locsync=false;
        setTimeout(startLocSync,metaReader.sync_pause);}

    var prompted=false;

    function freshState(evt){
        var req=fdjtUI.T(evt); sync_req=false;
        var traced=(Trace.state)||(Trace.network)||
            ((Trace.startup)&&(sync_count<1));
        if (req.readyState===4) {
            if ((req.status>=200)&&(req.status<300)) {
                var rtext=req.responseText;
                if (!(rtext)) return;
                var xstate=JSON.parse(rtext);
                var tick=fdjtTime.tick();
                if (xstate.changed) {
                    if (traced)
                        fdjtLog("freshState %o %j\n\t%j",
                                evt,xstate,metaReader.state);
                    if (xstate.changed>(tick+300))
                        fdjtLog.warn(
                            "Beware of oracles (future state date): %j %s",
                            xstate,new Date(xstate.changed*1000));
                    else if (!(metaReader.state)) {
                        metaReader.xstate=xstate;
                        restoreState(xstate);}
                    else if (metaReader.state.changed>xstate.changed)
                        // Our state is later, so we make it the xstate
                        metaReader.xstate=xstate;
                    else if ((prompted)&&(prompted>xstate.changed)) {
                        // We've already bothered the user since this
                        //  change was recorded, so we don't bother them
                        // again
                    }
                    else if (document[fdjtDOM.isHidden])
                        metaReader.freshstate=xstate;
                    else {
                        metaReader.xstate=xstate;
                        prompted=fdjtTime.tick();
                        metaReader.resolveXState(xstate);}}
                sync_count++;}
            else if (traced)
                fdjtLog("syncState(callback/error) %o %d %s",
                        evt,req.status,req.responseText);
            if (navigator.onLine) setConnected(true);
            syncing=false;}}

    var last_hidden=false;
    metaReader.visibilityChange=function visibilityChange(){
        if (!(document[fdjtDOM.isHidden])) {
            if ((last_hidden)&&((fdjtTime.tick()-last_hidden)<300)) {}
            else if (navigator.onLine) {
                last_hidden=false;
                syncState(true);}
            else if (metaReader.freshstate) {
                // Something changed while we were hidden
                var freshstate=metaReader.freshstate;
                last_hidden=false;
                metaReader.freshstate=false;
                metaReader.xstate=freshstate;
                prompted=fdjtTime.tick();
                metaReader.resolveXState(freshstate);}
            else {}}
        else last_hidden=fdjtTime.tick();};

    function forceSync(){
        if (metaReader.connected) metaReader.update();
        else if (metaReader._onconnect)
            metaReader._onconnect.push(mRUpdate);
        else metaReader._onconnect=[mRUpdate];
        if (!(metaReader.syncstart)) metaReader.syncLocation();
        else syncState();
    } metaReader.forceSync=forceSync;
    function mRUpdate(){metaReader.update();}

    function getLoc(x){
        var info=metaReader.getLocInfo(x);
        return ((info)&&(info.start));}

    /* This initializes the sbook state to the initial location with the
       document, using the hash value if there is one. */ 
    function initLocation() {
        var state=metaReader.state;
        if ((state)&&((state.location)||(state.target))) {}
        else {
            var target=$ID("METABOOKSTART")||fdjt.$1(".metareaderstart")||
                $ID("METABOOKTITLEPAGE")||$ID("PUBTOOLTITLEPAGE")||
                $ID("TITLEPAGE");
            if (target)
                state={location: getLoc(target),
                       // This is the beginning of the 21st century
                       changed: 978307200};
            else state={location: 1,changed: 978307200};}
        var goto_arg=((typeof state.location === "undefined")?(state.target):
                      (state.location));
        mR.GoTo(goto_arg,"initLocation",false,false,false);
        mR.saveState(state,true,true);}
    metaReader.initLocation=initLocation;

    function resolveXState(xstate) {
        var state=metaReader.state;
        if (!(metaReader.sync_interval)) return;
        if (metaReader.statedialog) {
            if (Trace.state)
                fdjtLog("resolveXState dialog exists: %o",
                        metaReader.statedialog);
            return;}
        if (Trace.state)
            fdjtLog("resolveXState state=%j, xstate=%j",state,xstate);
        if (!(state)) {
            metaReader.restoreState(xstate);
            return;}
        else if (xstate.maxloc>state.maxloc) {
            state.maxloc=xstate.maxloc;
            var statestring=JSON.stringify(state);
            saveLocal("mR("+mR.docid+").state",statestring);}
        else {}
        if (state.changed>=xstate.changed) {
            // The locally saved state is newer than the server,
            //  so we ignore the xstate (it might get synced
            //  separately)
            return;}
        var now=fdjtTime.tick();
        if ((now-state.changed)<(3000)) {
            // If our state changed in the past 5 minutes, don't
            // bother changing the current state.
            return;}
        if (Trace.state) 
            fdjtLog("Resolving local state %j with remote state %j",
                    state,xstate);
        var msg1="Start at";
        var choices=[];
        var latest=xstate.location, farthest=xstate.maxloc, loclen=xstate.loclen;
        var prefer_current=
            ((state.location>17)&&((now-state.changed)<(3600*24)));
        var prefer_latest=((loclen-farthest)>100);
        if ((farthest)&&(farthest>state.location)&&((loclen-farthest)>20))
            choices.push(
                {label: "farthest @"+loc2pct(farthest,loclen),
                 title: "your farthest location on any device/app",
                 isdefault: ((!(prefer_latest))&&(!(prefer_current))),
                 handler: function(){
                     metaReader.GoTo(xstate.maxloc,"sync");
                     state=metaReader.state; state.changed=fdjtTime.tick();
                     metaReader.saveState(state,true,true);
                     metaReader.hideCover();}});
        if ((latest)&&(latest!==state.location)&&(latest!==farthest))
            choices.push(
                {label: ("latest @"+loc2pct(latest,loclen)),
                 title: "the most recent location on any device/app",
                 isdefault: ((prefer_latest)&&(!(prefer_current))),
                 handler: function(){
                     metaReader.restoreState(xstate);
                     state.changed=fdjtTime.tick();
                     metaReader.saveState(state,true,true);
                     metaReader.hideCover();}});
        if ((choices.length)&&(state.location>17))
            choices.push(
                {label: ("current @"+((state.location<42)?("start"):
                                      (loc2pct(state.location,loclen)))),
                 title: "the most recent location on this device",
                 isdefault: prefer_current,
                 handler: function(){
                     state.changed=fdjtTime.tick();
                     metaReader.restoreState(state);
                     metaReader.saveState(state,true,true);
                     metaReader.hideCover();}});
        if (choices.length)
            choices.push(
                {label: "stop syncing",
                 title: "stop syncing this book on this device",
                 handler: function(){
                     setConfig("locsync",false,true);}});
        if (Trace.state)
            fdjtLog("resolveXState choices=%j",choices);
        if (choices.length)
            metaReader.statedialog=fdjtUI.choose(
                {choices: choices,cancel: true,timeout: 7,
                 // nodefault: true,
                 // noauto: true,
                 onclose: function(){metaReader.statedialog=false;},
                 spec: "div.fdjtdialog.resolvestate#METABOOKRESOLVESTATE"},
                fdjtDOM("div",msg1));}
    metaReader.resolveXState=resolveXState;

    function clearStateDialog(){
        if (metaReader.statedialog) {
            fdjt.Dialog.close(metaReader.statedialog);
            metaReader.statedialog=false;}}
    metaReader.clearStateDialog=clearStateDialog;
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
