/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/syncstate.js ###################### */

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

(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtState=fdjt.State;
    var fdjtLog=fdjt.Log, fdjtUI=fdjt.UI, fdjtTime=fdjt.Time;
    var $ID=fdjt.ID;
    var mB=metaBook, mbID=mB.ID;
    var saveLocal=mB.saveLocal, readLocal=mB.readLocal;
    var clearLocal=mB.clearLocal;
    var Trace=metaBook.Trace;
    var loc2pct=metaBook.location2pct;
    var sync_count=0;

    var setTarget, setConnected, setConfig;
    function init_local(){
        setTarget=metaBook.setTarget;
        setConnected=metaBook.setConnected;
        setConfig=metaBook.setConfig;}
    metaBook.inits.push(init_local);

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
    //  metaBook.inithash).
    metaBook.initState=function initState() {
        var state=readLocal("mB("+mB.docid+").state",true);
        var hash=metaBook.inithash;
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
                state.refuri=metaBook.refuri;
                state.docuri=metaBook.docuri;
                state.target=hash;
                state.location=false;
                state.changed=fdjtTime.tick();
                saveLocal("mB("+mB.docid+").state",state,true);}}
        if (state) metaBook.state=state;};
    
    // This records the current state of the app, bundled into an
    //  object. It primarily consists a location, a target, and
    //  the time it was last changed.
    // Mechanically, this procedure fills things out and stores the object
    //  in both metaBook.state and local/session storage.  If the changed
    //  date is later than the current metaBook.xstate, it also does
    //  an Ajax call to update the server.
    // Finally, unless skiphist is true, it updates the browser
    //  history to get the browser button to be useful.
    function saveState(state,skiphist,force){
        if ((!force)&&(state)&&
            ((metaBook.state===state)||
             ((metaBook.state)&&
              (metaBook.state.target===state.target)&&
              (metaBook.state.location===state.location)&&
              (metaBook.state.page===state.page))))
            return;
        if (!(state)) state=metaBook.state;
        if (!(state.changed)) state.changed=fdjtTime.tick();
        if (!(state.refuri)) state.refuri=metaBook.refuri;
        if (!(state.docuri)) state.docuri=metaBook.docuri;
        var title=state.title, frag=state.target;
        if ((!(title))&&(frag)&&(metaBook.docinfo[frag])) {
            state.title=title=metaBook.docinfo[frag].title||
                metaBook.docinfo[frag].head.title;}
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
        metaBook.state=state;
        var statestring=JSON.stringify(state);
        saveLocal("mB("+mB.docid+").state",statestring);
        if ((!(syncing))&&(metaBook.locsync)&&(metaBook.user)&&
            ((!(metaBook.xstate))||(state.changed>metaBook.xstate.changed)))
            syncState(true);
        if ((!(skiphist))&&(frag)&&
            (window.history)&&(window.history.pushState))
            setHistory(state,frag,title);
    } metaBook.saveState=saveState;

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
        if ((!(title))&&(hash)&&(metaBook.docinfo[hash])) {
            state.title=title=metaBook.docinfo[hash].title||
                metaBook.docinfo[hash].head.title;}
        if ((!(hash))&&(state.location)&&
            (typeof state.location === "number"))
            hash="SBOOKLOC"+state.location;
        if (Trace.state)
            fdjtLog("Pushing history %j %s (%s) '%s'",
                    state,href,title);
        if ((!(window.history.state))||
            (window.history.state.target!==state.target)||
            (window.history.state.location!==state.location)) {
            window.history.pushState(state,title,href+"#"+hash);}
    }
    metaBook.setHistory=setHistory;

    function restoreState(state,reason,savehist){
        if (Trace.state) fdjtLog("Restoring (%s) state %j",reason,state);
        if (state.location)
            metaBook.GoTo(state.location,reason||"restoreState",
                          ((state.target)&&(mbID(state.target))),
                          false,(!(savehist)));
        else if ((state.page)&&(metaBook.layout)) {
            metaBook.GoToPage(state.page,reason||"restoreState",
                              false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        else if (state.target) {
            metaBook.GoTo(state.target,reason||"restoreState",
                          true,false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        if (!(state.refuri)) state.refuri=metaBook.refuri;
        if (!(state.docuri)) state.docuri=metaBook.docuri;
        saveState(state);
    } metaBook.restoreState=restoreState;

    function clearState(){
        metaBook.state=false;
        clearLocal("mB("+mB.docid+").state");
        metaBook.xstate=false;
    } metaBook.clearState=clearState;

    function resetState(){
        var state=metaBook.state;
        if (state.location) state.maxloc=location;
        state.reset=true;
        var statestring=JSON.stringify(state);
        saveLocal("mB("+mB.docid+").state",statestring);
        syncState(true);}
    metaBook.resetState=resetState;

    var sync_req=false, sync_wait=false, last_sync=false;
    // Post the current state and update synced state from what's
    // returned
    function syncState(force){
        var elapsed=(last_sync)?(fdjtTime.tick()-last_sync):(3600*24*365*10);
        var timeout_id=false;
        function gotState(req){
            if (timeout_id) {
                clearTimeout(timeout_id);
                timeout_id=false;}
            // Don't handle state if you timed out
            else return;
            if (req.text) freshState(JSON.parse(req.text));}
        if ((syncing)||((!(force))&&(!(metaBook.locsync)))) return;
        if (!(metaBook.user)) return;
        if (sync_req) {
            fdjtLog("Skipping state sync because one is already in process");
            if (sync_wait) clearTimeout(sync_wait);
            setTimeout(function(){syncState(force);},15000);
            return;}
        if ((!(force))&&(elapsed<metaBook.sync_interval)) {
            if (Trace.state)
                fdjtLog("Skipping state sync because it's too soon");
            return;}
        if ((!(force))&&(metaBook.state)&&
            ((!(fdjtDOM.isHidden))||(document[fdjtDOM.isHidden]))&&
            (elapsed<(5*metaBook.sync_interval))) {
            if (Trace.state)
                fdjtLog("Skipping state sync because page is hidden");
            return;}
        if ((!(force))&&(elapsed<(metaBook.sync_min))) {
            sync_wait=setTimeout(
                function(){syncState(force);},
                metaBook.sync_min);
            return;}
        else if (sync_wait) {clearTimeout(sync_wait); sync_wait=false;} 
        if (((force)||(metaBook.locsync))&&(navigator.onLine)) {
            var traced=(Trace.state)||(Trace.network);
            var state=metaBook.state;
            var refuri=
                ((metaBook.target)&&(metaBook.getRefURI(metaBook.target)))||
                (metaBook.refuri);
            var sync_uri="https://sync.bookhub.io/v1/sync"+
                "?REFURI="+encodeURIComponent(refuri)+
                "&DOCURI="+encodeURIComponent(metaBook.docuri)+
                "&NOW="+fdjtTime.tick();
            metaBook.last_sync=last_sync=fdjtTime.tick(); syncing=state;
            if (metaBook.user) sync_uri=sync_uri+
                "&SYNCUSER="+encodeURIComponent(metaBook.user._id);
            if (metaBook.mycopyid) sync_uri=sync_uri+
                "&MYCOPYID="+encodeURIComponent(metaBook.mycopyid);
            if (metaBook.deviceName) sync_uri=sync_uri+
                "&DEVICE="+encodeURIComponent(metaBook.deviceName);
            if (metaBook.ends_at) sync_uri=sync_uri+
                "&LOCLEN="+encodeURIComponent(metaBook.ends_at);
            if (state) {
                if (state.target) sync_uri=sync_uri+
                    "&TARGET="+encodeURIComponent(state.target);
                if ((state.location)||(state.hasOwnProperty('location')))
                    sync_uri=sync_uri+
                    "&LOCATION="+encodeURIComponent(state.location);
                if (state.changed) sync_uri=sync_uri+
                    "&CHANGED="+encodeURIComponent(state.changed);
                if (state.reset) sync_uri=sync_uri+"&RESET=true";}
            syncing=state;
            var headers={}, options=
                {headers: headers,mode: 'cors',
                 timeout: metaBook.sync_timeout};
            if (mB.mycopyid) headers.Authorization="Bearer "+mB.mycopyid;
            else options.credentials='same-origin';
            setTimeout(syncTimeout,metaBook.sync_timeout);
            if (traced) fdjtLog("syncState(call) %s",sync_uri);
            fetch(sync_uri,options)
                .then(gotState)
                .catch(syncFailed);}}
    metaBook.syncState=syncState;

    function syncTimeout(evt){
        evt=evt||window.event;
        fdjtLog.warn("Sync request timed out, pausing for %ds",
                     metaBook.sync_pause/1000);
        metaBook.locsync=false;
        setTimeout(function(){
            metaBook.locsync=true;},
                   metaBook.sync_pause);}

    var prompted=false;

    function freshState(xstate){
        var traced=(Trace.state)||(Trace.network)||
            ((Trace.startup)&&(sync_count<1));
        var tick=fdjtTime.tick();
        if (xstate.changed) {
            if (traced)
                fdjtLog("freshState %j\n\t%j",xstate,metaBook.state);
            if (xstate.changed>(tick+300))
                fdjtLog.warn(
                    "Beware of oracles (future state date): %j %s",
                    xstate,new Date(xstate.changed*1000));
            else if (!(metaBook.state)) {
                metaBook.xstate=xstate;
                restoreState(xstate);}
            else if (metaBook.state.changed>xstate.changed)
                // Our state is later, so we make it the xstate
                metaBook.xstate=xstate;
            else if ((prompted)&&(prompted>xstate.changed)) {
                // We've already bothered the user since this
                //  change was recorded, so we don't bother them
                // again
            }
            else if (document[fdjtDOM.isHidden])
                metaBook.freshstate=xstate;
            else {
                metaBook.xstate=xstate;
                prompted=fdjtTime.tick();
                metaBook.resolveXState(xstate);}}
        if (navigator.onLine) setConnected(true);
        syncing=false;
        sync_count++;}

    function syncFailed(req) {
        try {
            fdjtLog.warn(
                "Sync request %s returned status %d %j, pausing for %ds",
                req.uri,req.status,JSON.parse(req.responseText),
                metaBook.sync_pause);}
        catch (err) {
            fdjtLog.warn(
                "Sync request %s returned status %d, pausing for %ds",
                req.uri,req.status,metaBook.sync_pause/1000);}
        metaBook.locsync=false;
        setTimeout(function(){metaBook.locsync=true;},
                   metaBook.sync_pause);}

    var last_hidden=false;
    metaBook.visibilityChange=function visibilityChange(){
        if (!(document[fdjtDOM.isHidden])) {
            if ((last_hidden)&&((fdjtTime.tick()-last_hidden)<300)) {}
            else if (navigator.onLine) {
                last_hidden=false;
                syncState(true);}
            else if (metaBook.freshstate) {
                // Something changed while we were hidden
                var freshstate=metaBook.freshstate;
                last_hidden=false;
                metaBook.freshstate=false;
                metaBook.xstate=freshstate;
                prompted=fdjtTime.tick();
                metaBook.resolveXState(freshstate);}
            else {}}
        else last_hidden=fdjtTime.tick();};

    function forceSync(){
        if (metaBook.connected) metaBook.update();
        else if (metaBook._onconnect)
            metaBook._onconnect.push(function(){metaBook.update();});
        else metaBook._onconnect=[function(){metaBook.update();}];
        if (!(metaBook.syncstart)) metaBook.syncLocation();
        else syncState();
    } metaBook.forceSync=forceSync;

    function getLoc(x){
        var info=metaBook.getLocInfo(x);
        return ((info)&&(info.start));}

    /* This initializes the sbook state to the initial location with the
       document, using the hash value if there is one. */ 
    function initLocation() {
        var state=metaBook.state;
        if (state) {}
        else {
            var target=$ID("METABOOKSTART")||fdjt.$1(".metabookstart")||
                $ID("SBOOKSTART")||fdjt.$1(".sbookstart")||
                $ID("SBOOKTITLEPAGE");
            if (target)
                state={location: getLoc(target),
                       // This is the beginning of the 21st century
                       changed: 978307200};
            else state={location: 1,changed: 978307200};}
        metaBook.saveState(state,true,true);}
    metaBook.initLocation=initLocation;

    function resolveXState(xstate) {
        var state=metaBook.state;
        if (!(metaBook.sync_interval)) return;
        if (metaBook.statedialog) {
            if (Trace.state)
                fdjtLog("resolveXState dialog exists: %o",
                        metaBook.statedialog);
            return;}
        if (Trace.state)
            fdjtLog("resolveXState state=%j, xstate=%j",state,xstate);
        if (!(state)) {
            metaBook.restoreState(xstate);
            return;}
        else if (xstate.maxloc>state.maxloc) {
            state.maxloc=xstate.maxloc;
            var statestring=JSON.stringify(state);
            saveLocal("mB("+mB.docid+").state",statestring);}
        else {}
        if (state.changed>=xstate.changed) {
            // The locally saved state is newer than the server,
            //  so we ignore the xstate (it might get synced
            //  separately)
            return;}
        var now=fdjtTime.tick();
        if ((now-state.changed)<(30)) {
            // If our state changed in the past 30 seconds, don't
            // bother changing the current state.
            return;}
        if (Trace.state) 
            fdjtLog("Resolving local state %j with remote state %j",
                    state,xstate);
        var msg1="Start at";
        var choices=[];
        var latest=xstate.location, farthest=xstate.maxloc;
        if (farthest>state.location)
            choices.push(
                {label: "farthest @"+loc2pct(farthest),
                 title: "your farthest location on any device/app",
                 isdefault: false,
                 handler: function(){
                     metaBook.GoTo(xstate.maxloc,"sync");
                     state=metaBook.state; state.changed=fdjtTime.tick();
                     metaBook.saveState(state,true,true);
                     metaBook.hideCover();}});
        if ((latest!==state.location)&&(latest!==farthest))
            choices.push(
                {label: ("latest @"+loc2pct(latest)),
                 title: "the most recent location on any device/app",
                 isdefault: false,
                 handler: function(){
                     metaBook.restoreState(xstate); state=metaBook.state;
                     state.changed=fdjtTime.tick();
                     metaBook.saveState(state,true,true);
                     metaBook.hideCover();}});
        if ((choices.length)&&(state.location>17))
            choices.push(
                {label: ("current @"+((state.location<42)?("start"):
                                      (loc2pct(state.location)))),
                 title: "the most recent location on this device",
                 isdefault: true,
                 handler: function(){
                     state.changed=fdjtTime.tick();
                     metaBook.saveState(state,true,true);
                     metaBook.hideCover();}});
        if (choices.length)
            choices.push(
                {label: "stop syncing",
                 title: "stop syncing this book on this device",
                 handler: function(){
                     setConfig("locsync",false,true);}});
        if (Trace.state)
            fdjtLog("resolveXState choices=%j",choices);
        if (choices.length)
            metaBook.statedialog=fdjtUI.choose(
                {choices: choices,cancel: true,timeout: 7,
                 nodefault: true,noauto: true,
                 onclose: function(){metaBook.statedialog=false;},
                 spec: "div.fdjtdialog.resolvestate#METABOOKRESOLVESTATE"},
                fdjtDOM("div",msg1));}
    metaBook.resolveXState=resolveXState;

    function clearStateDialog(){
        if (metaBook.statedialog) {
            fdjt.Dialog.close(metaBook.statedialog);
            metaBook.statedialog=false;}}
    metaBook.clearStateDialog=clearStateDialog;
})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
