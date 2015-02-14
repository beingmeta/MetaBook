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

    var setCheckSpan=fdjtUI.CheckSpan.set;

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

    function setConfig(name,value,save){
        if (arguments.length===1) {
            var config=name;
            metaBook.postconfig=[];
            if (Trace.config) fdjtLog("batch setConfig: %s",config);
            for (var setting in config) {
                if (config.hasOwnProperty(setting))
                    setConfig(setting,config[setting]);}
            var dopost=metaBook.postconfig;
            metaBook.postconfig=false;
            if ((Trace.config>1)&&(!((dopost)||(dopost.length===0))))
                fdjtLog("batch setConfig, no post processing",config);
            var post_i=0; var post_lim=dopost.length;
            while (post_i<post_lim) {
                if (Trace.config>1)
                    fdjtLog("batch setConfig, post processing %s",
                            dopost[post_i]);
                dopost[post_i++]();}
            return;}
        if (Trace.config) fdjtLog("setConfig %o=%o",name,value);
        var input_name="METABOOK"+(name.toUpperCase());
        var inputs=document.getElementsByName(input_name);
        var input_i=0, input_lim=inputs.length;
        while (input_i<input_lim) {
            var input=inputs[input_i++];
            if (input.tagName!=='INPUT') continue;
            if (input.type==='checkbox') {
                if (value) setCheckSpan(input,true);
                else setCheckSpan(input,false);}
            else if (input.type==='radio') {
                if (value===input.value) setCheckSpan(input,true);
                else setCheckSpan(input,false);}
            else input.value=value;}
        if (!((current_config.hasOwnProperty(name))&&
              (current_config[name]===value))) {
            if (config_handlers[name]) {
                if (Trace.config)
                    fdjtLog("setConfig (handler=%s) %o=%o",
                            config_handlers[name],name,value);
                config_handlers[name](name,value);}
            else if (Trace.config)
                fdjtLog("setConfig (no handler) %o=%o",name,value);
            else {}}
        else if (Trace.config)
            fdjtLog("Redundant setConfig %o=%o",name,value);
        else {}
        if (current_config[name]!==value) {
            current_config[name]=value;
            if ((!(save))&&(inputs.length))
                fdjtDOM.addClass("METABOOKSETTINGS","changed");}
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
        saveLocal("metabook.config("+mB.docuri+")",JSON.stringify(saved));
        fdjtDOM.dropClass("METABOOKSETTINGS","changed");
        saved_config=saved;}
    metaBook.saveConfig=saveConfig;

    function initConfig(){
        var setting, started=fdjtTime(); // changed=false;
        var config=getLocal("metabook.config("+mB.docuri+")",true)||
            fdjtState.getSession("metabook.config("+mB.docuri+")",
                                 true);
        metaBook.postconfig=[];
        if (config) {
            for (setting in config) {
                if ((config.hasOwnProperty(setting))&&
                    (!(getQuery(setting)))) {
                    // if ((!(default_config.hasOwnProperty(setting)))||
                    //    (config[setting]!==default_config[setting]))
                    //    changed=true;
                    setConfig(setting,config[setting]);}}}
        else config={};
        if (Trace.config)
            fdjtLog("initConfig (default) %j",default_config);
        for (setting in default_config) {
            if (!(config.hasOwnProperty(setting)))
                if (default_config.hasOwnProperty(setting)) {
                    if (getQuery(setting))
                        setConfig(setting,getQuery(setting));
                    else if (getMeta("METABOOK."+setting))
                        setConfig(setting,getMeta("METABOOK."+setting));
                    else setConfig(setting,default_config[setting]);}}
        var dopost=metaBook.postconfig;
        metaBook.postconfig=false;
        var i=0; var lim=dopost.length;
        while (i<lim) dopost[i++]();
        
        // if (changed) fdjtDOM.addClass("METABOOKSETTINGS","changed");
        
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
            setConfig(name,elt.checked||false,save);
        else setConfig(name,elt.value,save);}
    metaBook.updateConfig=updateConfig;


    function metabookPropConfig(name,value){
        metaBook[name]=value;}
    metaBook.propConfig=metabookPropConfig;
    metaBook.addConfig("forcelayout",metabookPropConfig);

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
        fdjtUI.TapHold.default_opts.holdthresh=value;});
    metaBook.addConfig("wandermsecs",function(name,value){
        metaBook.wandermsecs=value;
        fdjtUI.TapHold.default_opts.wanderthresh=value;});
    metaBook.addConfig("taptapmsecs",function(name,value){
        metaBook.taptapmsecs=value;
        fdjtUI.TapHold.default_opts.taptapthresh=value;});

    metaBook.addConfig("syncinterval",function(name,value){
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
        metaBook.locsync=value;});
    
    function applyMetaClass(name,metaname){
        if (!(metaname)) metaname=name;
        var meta=getMeta(metaname,true);
        var i=0; var lim=meta.length;
        while (i<lim) fdjtDOM.addClass(fdjtDOM.$(meta[i++]),name);}
    metaBook.applyMetaClass=applyMetaClass;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
