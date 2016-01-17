/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/config.js ###################### */

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

// config.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log, fdjtUI=fdjt.UI;
    var fdjtState=fdjt.State, fdjtTime=fdjt.Time, fdjtString=fdjt.String;

    var getChildren=fdjtDOM.getChildren;

    var getMeta=fdjtDOM.getMeta;

    var isEmpty=fdjtString.isEmpty;

    var getLocal=fdjtState.getLocal;
    var getQuery=fdjtState.getQuery;
    
    var mB=metaBook, Trace=metaBook.Trace;
    var saveLocal=mB.saveLocal;
    
    /* Configuration information */

    var config_handlers={};
    var default_config=metaBook.default_config;
    var current_config={};
    var saved_config={};

    function addConfig(name,handler){
        if (Trace.config>1)
            fdjtLog("Adding config handler for %s: %s",name,handler);
        config_handlers[name]=handler;
        if (current_config.hasOwnProperty(name)) {
            if (Trace.config>1)
                fdjtLog("Applying config handler to current %s=%s",
                        name,current_config[name]);
            handler(name,current_config[name]);}}
    metaBook.addConfig=addConfig;

    function getConfig(name){
        if (!(name)) return current_config;
        else return current_config[name];}
    metaBook.getConfig=getConfig;

    function setConfig(name,value,save,cxt){
        if (cxt) cxt=" ("+cxt+")";
        else cxt="";
        if (arguments.length===1) {
            var config=name;
            metaBook.postconfig=[];
            if (Trace.config)
                fdjtLog("batch setConfig %s: %s",cxt,config);
            for (var setting in config) {
                if (config.hasOwnProperty(setting))
                    setConfig(setting,config[setting]);}
            var dopost=metaBook.postconfig;
            metaBook.postconfig=false;
            if ((Trace.config>1)&&(!((dopost)||(dopost.length===0))))
                fdjtLog("batch setConfig, no post processing %s",
                        config,cxt);
            var post_i=0; var post_lim=dopost.length;
            while (post_i<post_lim) {
                if (Trace.config>1)
                    fdjtLog("batch setConfig%s, post processing %s",
                            dopost[post_i]);
                dopost[post_i++]();}
            return;}
        if (Trace.config) fdjtLog("setConfig%s %o=%o",cxt,name,value);
        if (!((current_config.hasOwnProperty(name))&&
              (current_config[name]===value))) {
            if (config_handlers[name]) {
                if (Trace.config)
                    fdjtLog("setConfig%s (handler=%s) %o=%o",
                            cxt,config_handlers[name],name,value);
                config_handlers[name](name,value);}
            else if (Trace.config)
                fdjtLog("setConfig%s (no handler) %o=%o",cxt,name,value);
            else {}
            current_config[name]=value;}
        else if (Trace.config)
            fdjtLog("Redundant setConfig%s %o=%o",cxt,name,value);
        else {}
        if ((save)&&(saved_config[name]!==value)) {
            saved_config[name]=value;
            saveConfig(saved_config);}}
    metaBook.setConfig=setConfig;
    metaBook.resetConfig=function(){setConfig(saved_config);};

    function saveConfig(config){
        if (Trace.config) {
            fdjtLog("saveConfig %o",config);
            fdjtLog("saved_config=%o",saved_config);}
        if (!(config)) config=saved_config;
        // Save automatically applies (seems only fair)
        else setConfig(config);
        var saved={};
        for (var setting in config) {
            if ((default_config.hasOwnProperty(setting))&&
                (config[setting]!==default_config[setting])&&
                (!(getQuery(setting)))) {
                saved[setting]=config[setting];}}
        if (Trace.config) fdjtLog("Saving config %o",saved);
        saveLocal("mB("+mB.docid+").config",JSON.stringify(saved));
        saved_config=saved;}
    metaBook.saveConfig=saveConfig;

    function initConfig(){
        var setting, value, source, started=fdjtTime(); // changed=false;
        var config=getLocal("mB("+mB.docid+").config",true)||
            fdjtState.getSession("mB("+mB.docid+").config",
                                 true);
        metaBook.postconfig=[];
        if (config) {
            if (Trace.config) fdjtLog("initConfig local=%j",config);
            for (setting in config) {
                if (config.hasOwnProperty(setting)) {
                    // if ((!(default_config.hasOwnProperty(setting)))||
                    //    (config[setting]!==default_config[setting]))
                    //    changed=true;
                    if (getQuery(setting)) {
                        value=getQuery(setting); source="initConfig/QUERY";}
                    else {
                        value=config[setting]; source="initConfig/local";}
                    setConfig(setting,value,false,source);
                    metaBook.updateSettings(setting,value);}}}
        else config={};
        if (Trace.config) fdjtLog("initConfig default=%j",default_config);
        for (setting in default_config) {
            if ((default_config.hasOwnProperty(setting))&&
                (!((config.hasOwnProperty(setting))||(getQuery(setting))))) {
                if (getMeta("METABOOK."+setting)) {
                    value=getMeta("METABOOK."+setting);
                    source="initConfig/HTML";}
                else {
                    value=default_config[setting];
                    source="initConfig/appdefaults";}
                setConfig(setting,value,false,"initConfig/HTML");
                setConfig(setting,value,false,source);
                metaBook.updateSettings(setting,value);}}
        var dopost=metaBook.postconfig;
        metaBook.postconfig=false;
        var i=0; var lim=dopost.length;
        while (i<lim) dopost[i++]();
        
        var devicename=current_config.devicename;
        if ((devicename)&&(!(isEmpty(devicename))))
            metaBook.deviceName=devicename;
        if (Trace.startup>1)
            fdjtLog("initConfig took %dms",fdjtTime()-started);}
    metaBook.initConfig=initConfig;
    
    var getParent=fdjtDOM.getParent;
    var getChild=fdjtDOM.getChild;

    function updateConfig(name,id,save){
        if (typeof save === 'undefined') save=false;
        var elt=((typeof id === 'string')&&(document.getElementById(id)))||
            ((id.nodeType)&&(getParent(id,'input')))||
            ((id.nodeType)&&(getChild(id,'input')))||
            ((id.nodeType)&&(getChild(id,'textarea')))||
            ((id.nodeType)&&(getChild(id,'select')))||
            (id);
        if (Trace.config) fdjtLog("Update config %s",name);
        if ((elt.type==='radio')||(elt.type==='checkbox'))
            setConfig(name,elt.checked||false,save,"updateConfig/checked");
        else setConfig(name,elt.value,save,"updateConfig/input");}
    metaBook.updateConfig=updateConfig;

    function metabookPropConfig(name,value){
        metaBook[name]=value;}
    metaBook.propConfig=metabookPropConfig;

    metaBook.addConfig("keyboardhelp",function(name,value){
        metaBook.keyboardhelp=value;
        fdjtUI.CheckSpan.set(
            document.getElementsByName("METABOOKKEYBOARDHELP"),
            value);});
    metaBook.addConfig("devicename",function(name,value){
        if (isEmpty(value)) metaBook.deviceName=false;
        else metaBook.deviceName=value;});

    metaBook.addConfig("holdmsecs",function(name,value){
        metaBook.holdmsecs=value;
        fdjtUI.TapHold.default_opts.holdmsecs=value;});
    metaBook.addConfig("wandermsecs",function(name,value){
        metaBook.wandermsecs=value;
        fdjtUI.TapHold.default_opts.wanderthresh=value;});
    metaBook.addConfig("taptapmsecs",function(name,value){
        metaBook.taptapmsecs=value;
        fdjtUI.TapHold.default_opts.taptapmsecs=value;});

    metaBook.addConfig("checksync",function(name,value){
        metaBook.sync_interval=value;
        if (metaBook.synctock) {
            clearInterval(metaBook.synctock);
            metaBook.synctock=false;}
        if ((value)&&(metaBook.locsync))
            metaBook.synctock=setInterval(metaBook.syncState,value*1000);});
    metaBook.addConfig("synctimeout",function(name,value){
        metaBook.sync_timeout=value;});
    metaBook.addConfig("syncpause",function(name,value){
        metaBook.sunc_pause=value;});

    metaBook.addConfig("locsync",function(name,value){
        // Start or clear the sync check interval timer
        if ((!(value))&&(metaBook.synctock)) {
            clearInterval(metaBook.synctock);
            metaBook.synctock=false;}
        else if ((value)&&(!(metaBook.synctock))&&
                 (metaBook.sync_interval))
            metaBook.synctock=setInterval(
                metaBook.syncState,(metaBook.sync_interval)*1000);
        else {}
        metaBook.locsync=value;
        fdjt.Async(function(){metaBook.updateSettings(name,value);});});
    
    function configChange(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var setting=target.name, val=target.value;
        var cur=current_config[setting];
        if ((target.checked)&&(cur===val)) return;
        else if (target.checked)
            setConfig(setting,val,true,"configChange");
        else if (target.type==="checkbox")
            setConfig(setting,"",true,"configChange");
        else {}}
    metaBook.configChange=configChange;

    function applyMetaClass(name,metaname){
        if (!(metaname)) metaname=name;
        var meta=getMeta(metaname,true);
        var i=0; var lim=meta.length;
        while (i<lim) fdjtDOM.addClass(fdjtDOM.$(meta[i++]),name);}
    metaBook.applyMetaClass=applyMetaClass;

    function updateSettings(setting,value){
        var forms=fdjtDOM.$(".metabooksettings");
        var i=0, n_forms=forms.length; while (i<n_forms) {
            var form=forms[i++];
            var inputs=getChildren(
                form,"input[type='CHECKBOX'],input[type='RADIO']");
            var toset=[], toclear=[];
            var j=0, n_inputs=inputs.length, input=false;
            while (j<n_inputs) {
                input=inputs[j++];
                if (input.name===setting) {
                    if ((value===true)?
                        (/(yes|on|true)/i.exec(input.value)):
                        (input.value===value))
                        toset.push(input);
                    else toclear.push(input);}}
            j=0; n_inputs=toset.length; while (j<n_inputs) {
                input=toset[j++];
                if (input.checked) continue;
                if (getParent(input,".checkspan")) 
                    fdjt.UI.CheckSpan.set(input,true);
                else input.checked=true;}
            j=0; n_inputs=toclear.length; while (j<n_inputs) {
                input=toclear[j++];
                if ((!(input.checked))&&
                    (typeof input.checked !== "undefined"))
                    continue;
                if (getParent(input,".checkspan"))
                    fdjt.UI.CheckSpan.set(input,false);
                else input.checked=false;}
            j=0; n_inputs=toset.length; while (j<n_inputs) {
                input=toset[j++];
                if (input.checked) continue;
                if (getParent(input,".checkspan")) 
                    fdjt.UI.CheckSpan.set(input,true);
                else input.checked=true;}}}
    metaBook.updateSettings=updateSettings;

    function initSettings(){
        var started=fdjtTime();
        for (var setting in current_config) {
            if (current_config.hasOwnProperty(setting))
                updateSettings(setting,current_config[setting]);}
        if (Trace.startup>1)
            fdjtLog("Finished initSettings in %dms",fdjtTime()-started);}
    metaBook.initSettings=initSettings;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
