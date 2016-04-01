/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/mycopyid.js ###################### */

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

// mycopyid.js
(function(){
    "use strict";
    var fdjtDOM=fdjt.DOM, fdjtLog=fdjt.Log;
    var fdjtTime=fdjt.Time, fdjtAsync=fdjt.Async;
    var fdjtState=fdjt.State, fdjtAjax=fdjt.Ajax;

    var mB=metaBook, Trace=mB.Trace;

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

    var good_origin=/https:\/\/[^\/]+.(bookhub\.io|metabooks\.net)/;
    function myCopyMessage(evt){
        var origin=evt.origin, data=evt.data;
        if (Trace.messages)
            fdjtLog("Got a message from %s with payload %s",
                    origin,data);
        if (origin.search(good_origin)!==0) {
            fdjtLog.warn("Rejecting insecure message from %s: %s",
                         origin,evt.data);
            return;}
        if (data.search(/^mycopyid=/)===0) {
            var mycopyid=data.slice(9);
            gotMyCopyId(mycopyid);
            return;}
        else return;}
    fdjtDOM.addListener(window,"message",myCopyMessage);

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
        fdjtAjax.fetchText(
            "https://auth.bookhub.io/getmycopyid?DOC="+mB.docref).
            then(function(mycopyid){
                gotMyCopyId(mycopyid).then(
                    function(){getting_mycopyid=false;});});}

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
