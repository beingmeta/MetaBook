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
    var fdjtTime=fdjt.Time, fdjtAjax=fdjt.Ajax;
    var fdjtState=fdjt.State;

    var mB=metaBook, Trace=mB.Trace;

    var getSession=fdjtState.getSession, getLocal=fdjtState.getLocal;

    var need_mycopyid=[];

    function setMyCopyId(string){
        if (!(string)) return;
        if (mB.mycopyid===string) return string;
        var parts=string.split('.'), payload=false, doc;
        try {
            payload=JSON.parse(atob(parts[1]));}
        catch (ex) {payload=false;}
        if (!(payload)) {
            fdjtLog.warn("Bad mycopyid JWT %s",string);
            return false;}
        else if ((doc=payload.doc)) {
            doc=(doc.replace(/^:/,"")).toLowerCase();
            if (doc!==mB.docid) {
                fdjtLog.warn("mycopyid for wrong title %s; doc=%s, payload=%j",
                             doc,mB.docid,payload);
                return false;}}
        else {}
        var now=new Date();
        var expstring=payload.exp;
        var expires=(expstring)&&(new Date(expstring));
        if (now>expires) {
            fdjtLog.warn("Expired (%s) mycopyid %j",expires,payload);
            return false;}
        if ((Trace.startup>1)||(Trace.creds)) {
            fdjtLog("Setting myCopyID to %s payload=%j",string,payload);}
        mB.mycopyid=string;
        mB.mycopyid_payload=payload;
        mB.mycopyid_expires=expires;
        mB.saveLocal("mb("+mB.refuri+").mycopyid",string);
        mB.saveLocal("mb("+mB.docid+").mycopyid",string);
        var waiting=need_mycopyid; need_mycopyid=[];
        var i=0, lim=waiting.length; while (i<lim) {
            waiting[i++](string);}
        return string;}
    metaBook.setMyCopyId=setMyCopyId;
            
    var good_origin=/https:\/\/[^\/]+.(bookhub\.io|metabooks\.net)/;
    function myCopyMessage(evt){
        var origin=evt.origin, data=evt.data;
        if ((Trace.messages)||(Trace.creds))
            fdjtLog("Got a message from %s with payload %s",
                    origin,data);
        if (origin.search(good_origin)!==0) {
            fdjtLog.warn("Rejecting insecure message from %s: %s",
                         origin,evt.data);
            return;}
        if (data.search(/^mycopyid=/)===0) {
            var mycopyid=data.slice(9);
            setMyCopyId(mycopyid);
            return;}
        else return;}
    fdjtDOM.addListener(window,"message",myCopyMessage);

    var getting_mycopyid=false;

    function getMyCopyId(){
        var now=new Date();
        if ((mB.mycopyid)&&
            ((!(mB.mycopyid_expires))||(now>mB.mycopyid_expires)))
            return Promise.resolve(mB.mycopyid);
        else return fetchMyCopyId();}
    metaBook.getMyCopyId=getMyCopyId;

    function readMyCopyId(){
        var mycopyid=(fdjtState.getQuery("MYCOPYID"))||
            (fdjtState.getCookie("MYCOPYID"))||
            ((mB.docid)&&(getSession("mycopyid("+mB.docid+")")))||
            ((mB.refuri)&&(getSession("mycopyid("+mB.refuri+")")))||
            ((mB.docid)&&(getSession("mB("+mB.docid+").mycopyid")))||
            ((mB.refuri)&&(getSession("mB("+mB.refuri+").mycopyid")))||
            ((mB.docid)&&(getLocal("mycopyid("+mB.docid+")")))||
            ((mB.refuri)&&(getLocal("mycopyid("+mB.refuri+")")))||
            ((mB.docid)&&(getLocal("mB("+mB.docid+").mycopyid")))||
            ((mB.refuri)&&(getLocal("mB("+mB.refuri+").mycopyid")));
        if ((mycopyid)&&((Trace.startup)||(Trace.creds)))
            fdjtLog("Read local myCopyID %s",mycopyid);
        if (mycopyid)
            return mB.setMyCopyId(mycopyid);
        else return false;}
    metaBook.readMyCopyId=readMyCopyId;

    function fetchMyCopyId(){
        function fetching_mycopyid(resolve,reject){
            need_mycopyid.push(resolve);
            if (getting_mycopyid) return;
            getting_mycopyid=fdjtTime();
            fdjtAjax.fetchText(
                "https://auth.bookhub.io/getmycopyid?DOC="+mB.docref).
                then(function(mycopyid,alt){
                    if (typeof mycopyid === 'undefined') {
                        if (Trace.creds)
                            fdjtLog("Failed call to fetch remote creds");
                        return reject(alt);}
                    getting_mycopyid=false;
                    if (Trace.creds)
                        fdjtLog("Fetched myCopyId from network");
                    setMyCopyId(mycopyid);});}
        return new Promise(fetching_mycopyid);}

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
