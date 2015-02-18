/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/glosses.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file implements the interface for adding and editing **glosses**,
   which are annotations associated with text passages in a document.

   This file is part of metaBook, a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knodules, visit www.knodules.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.
   This file assumes that the sbooks.js file has already been loaded.

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
/* global metaBook: false, Promise: false */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

(function () {
    "use strict";

    var fdjtString=fdjt.String;
    var fdjtState=fdjt.State;
    var fdjtTime=fdjt.Time;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var RefDB=fdjt.RefDB;
    var Ref=fdjt.Ref;
    var fdjtID=fdjt.ID;
    var mB=metaBook;
    var mbID=mB.ID;
    var Trace=metaBook.Trace;

    var addClass=fdjtDOM.addClass;
    var hasClass=fdjtDOM.hasClass;
    var dropClass=fdjtDOM.dropClass;
    var toggleClass=fdjtDOM.toggleClass;
    var swapClass=fdjtDOM.swapClass;
    var getParent=fdjtDOM.getParent;
    var hasParent=fdjtDOM.hasParent;
    var getChildren=fdjtDOM.getChildren;
    var getChild=fdjtDOM.getChild;
    var getInput=fdjtDOM.getInput;
    var getInputs=fdjtDOM.getInputs;
    var getInputFor=fdjtDOM.getInputFor;
    var getInputsFor=fdjtDOM.getInputsFor;
    var getInputValues=fdjtDOM.getInputValues;

    var cancel=fdjtUI.cancel;

    var setCheckSpan=fdjtUI.CheckSpan.set;

    var glossmodes=metaBook.glossmodes;

    var mbicon=metaBook.icon;

    var getTarget=metaBook.getTarget;

    var getGlossTags=metaBook.getGlossTags;

    var uri_prefix=/(http:)|(https:)|(ftp:)|(urn:)/;
    
    var saving_dialog=false;
    var selectors=[];

    function goodURL(string){
        return (/https?:[\/][\/](\w+[.])+\w+[\/]/).exec(string);}

    // The gloss mode is stored in two places:
    //  * the class of the gloss FORM element
    //  * as the class gloss+mode on METABOOKHUD (e.g. glossaddtag)
    function getGlossMode(arg){
        if (!(arg)) arg=fdjtID("METABOOKLIVEGLOSS");
        if (typeof arg === 'string') arg=fdjtID(arg);
        if ((!(arg))||(!(arg.nodeType))) return false;
        if (arg.tagName!=="FORM") arg=getChild(arg,"FORM");
        var classname=arg.className;
        var match=glossmodes.exec(classname);
        if ((!(match))||(match.length===0)||(!(match[0])))
            return false;
        else return match[0];}
    metaBook.getGlossMode=getGlossMode;

    function setGlossMode(mode,arg,toggle){
        if ((mode)&&(arg)&&(mode.nodeType)&&
            (typeof arg === "string")) {
            var tmp=mode; mode=arg; arg=tmp;}
        if (!(arg)) arg=fdjtID("METABOOKLIVEGLOSS");
        if (typeof arg === 'string') arg=fdjtID(arg);
        if ((!(arg))||(!(arg.nodeType))) return;
        var form=((arg.tagName==="FORM")?(arg):
                  ((fdjtDOM.getParent(arg,"form"))||
                   (fdjtDOM.getChild(arg,"form"))));
        var div=getParent(form,".metabookglossform");
        var input=false;
        if (!(form)) return;
        var frag=fdjtDOM.getInput(form,"FRAG");
        var uuid=fdjtDOM.getInput(form,"UUID");
        if ((Trace.mode)||(Trace.glossing)) {
            fdjtLog("setGlossMode %o%s: #%s #U%s",
                    mode,((toggle)?(" (toggle)"):("")),
                    ((frag)&&(frag.value)),
                    ((uuid)&&(uuid.value)));}
        if ((toggle)&&(mode===form.className)) mode=false;
        if (mode) addClass(div,"focused");
        if (!(mode)) {
            dropClass(form,glossmodes);
            dropClass("METABOOKHUD",/\bgloss\w+\b/);
            dropClass("METABOOKHUD","openheart");
            if (!(metaBook.touch)) {
                var glossinput=getInput(form,"NOTE");
                if (glossinput) metaBook.setFocus(glossinput);
                addClass(div,"focused");}
            return;}
        if (mode==="addtag") input=fdjtID("METABOOKADDTAGINPUT");
        else if (mode==="attach") {
            var upload_glossid=fdjtID("METABOOKUPLOADGLOSSID");
            upload_glossid.value=uuid.value;
            var upload_itemid=fdjtID("METABOOKUPLOADITEMID");
            upload_itemid.value=fdjtState.getUUID();
            input=fdjtID("METABOOKATTACHURL");}
        else if (mode==="addoutlet") input=fdjtID("METABOOKADDSHAREINPUT");
        else {
            dropClass(form,glossmodes);
            dropClass("METABOOKHUD",/\bgloss\w+\b/);
            return;}
        if ((Trace.mode)||(Trace.glossing))
            fdjtLog("setGlossMode gm=%s input=%o",mode,input);
        form.className=mode;
        swapClass("METABOOKHUD",/\bgloss\w+\b/,"gloss"+mode);
        metaBook.setHUD(true);
        if ((mode)&&(/(addtag|addoutlet)/.exec(mode)))
            addClass("METABOOKHUD","openheart");
        if (input) metaBook.setFocus(input);}
    metaBook.setGlossMode=setGlossMode;

    // set the gloss target for a particular passage
    function getGlossForm(arg,response) {
        if (typeof arg === 'string')
            arg=fdjtID(arg)||metaBook.glossdb.ref(arg)||false;
        if (!(arg)) return false;
        var gloss=((!(arg.nodeType))&&((arg.maker)||(arg.gloss))&&(arg));
        if (!(gloss)) response=false;
        else if ((arg.maker)&&(arg.maker!==metaBook.user))
            response=true;
        else {}
        var passage=((gloss)?(mbID(gloss.frag)):(arg));
        var passageid=((passage.codexbaseid)||(passage.id));
        var formid=((gloss)?
                    ((response)?
                     ("METABOOKRESPONDGLOSS_"+gloss._id):
                     ("METABOOKEDITGLOSS_"+gloss._id)):
                    ("METABOOKADDGLOSS_"+passageid));
        var form=fdjtID(formid);
        var div=((form)&&(form.parentNode));
        var proto=fdjtID("METABOOKADDGLOSSPROTOTYPE");
        if (!(div)) {
            div=proto.cloneNode(true); div.id="";
            fdjtDOM(fdjtID("METABOOKADDGLOSS"),div);
            form=getChildren(div,"form")[0];
            form.id=formid;
            form=setupGlossForm(form,passage,gloss,response||false);
            metaBook.setupGestures(div);}
        else form=getChildren(div,"form")[0];
        if (gloss) {
            if (response) addClass(div,"glossreply");
            else {
                addClass(div,"glossedit");
                addClass(metaBook.HUD,"editgloss");}}
        else addClass(div,"glossadd");
        if (form) return div; else return false;}
    metaBook.getGlossForm=getGlossForm;
    
    function setupGlossForm(form,passage,gloss,response){
        var passageid=((passage.codexbaseid)||(passage.id));
        var info=metaBook.docinfo[passageid];
        if (form.getAttribute("sbooksetup")) return false;
        if (!(info)) return false;
        form.onsubmit=submitGloss;
        getInput(form,"REFURI").value=metaBook.refuri;
        getInput(form,"DOCTITLE").value=document.title;
        getInput(form,"DOCURI").value=document.location.href;
        getInput(form,"FRAG").value=passageid;
        if (info.wsnid) getInput(form,"WSNID").value=info.wsnid;
        if (metaBook.user) getInput(form,"MAKER").value=metaBook.user._id;
        if (metaBook.mycopyid) getInput(form,"MYCOPYID").value=metaBook.mycopyid;
        if (gloss) {
            var glossdate_elt=getChild(form,".glossdate");
            fdjtDOM(glossdate_elt,fdjtTime.shortString(gloss.created));
            glossdate_elt.title=fdjtTime.timeString(gloss.created);}
        var glossinput=getInput(form,"NOTE");
        var notespan=getChild(form,".notespan");
        if (glossinput) {
            glossinput.onkeypress=glossinput_onkeypress;
            glossinput.onkeydown=glossinput_onkeydown;
            glossinput.onfocus=glossinput_onfocus;
            if ((gloss)&&(!(response))) {
                glossinput.value=gloss.note||"";
                if (notespan) notespan.innerHTML=glossinput.value;}
            else glossinput.value="";}
        if (metaBook.syncstamp)
            getInput(form,"SYNC").value=(metaBook.syncstamp+1);
        var menu=getChild(form,".addglossmenu");
        fdjt.UI.TapHold(menu,{override: true});
        var loc=getInput(form,"LOCATION");
        var loclen=getInput(form,"LOCLEN");
        var tagline_elt=getInput(form,"TAGLINE");
        var respondsto=getInput(form,"RE");
        var thread=getInput(form,"THREAD");
        var uuidelt=getInput(form,"UUID");
        var detail_elt=getInput(form,"DETAIL");
        var response_elt=getChild(form,"div.response");
        if ((response_elt)&&(response)&&(gloss)) {
            var maker_elt=getChild(response_elt,".respmaker");
            var date_elt=getChild(response_elt,".respdate");
            var note_elt=getChild(response_elt,".respnote");
            var makerinfo=metaBook.sourcedb.ref(gloss.maker);
            fdjtDOM(maker_elt,makerinfo.name);
            fdjtDOM(date_elt,fdjtTime.shortString(gloss.created));
            if (gloss.note) {
                if (gloss.note.length>42) 
                    fdjtDOM(note_elt,gloss.note.slice(0,42)+"…");
                else fdjtDOM(note_elt,gloss.note);
                note_elt.title=gloss.note;}
            else fdjtDOM.remove(note_elt);}
        else {
            fdjtDOM.remove(response_elt); response_elt=false;}
        if (loc) {loc.value=info.starts_at;}
        if (loclen) {loclen.value=info.ends_at-info.starts_at;}
        if ((response)&&(gloss)) {
            thread.disabled=false; respondsto.disabled=false;
            thread.value=gloss.thread||gloss._id;
            respondsto.value=gloss._id;}
        else {
            respondsto.disabled=true;
            thread.disabled=true;}
        var tagline=getTagline(passage);
        if (tagline) tagline_elt.value=tagline;
        if (gloss) {
            var tags=getGlossTags(gloss);
            if (tags.length) {
                var i=0; var lim=tags.length;
                while (i<lim) addTag(form,tags[i++],false);}}
        if ((gloss)&&(!(response))&&(gloss.posted)) {
            var wasposted=getChild(form,".wasposted");
            if (wasposted) wasposted.disabled=false;
            var postgloss=getChild(form,".postgloss");
            fdjtUI.setCheckspan(postgloss,true);}
        if ((gloss)&&(!(response))&&(gloss.links)) {
            var links=gloss.links;
            for (var url in links) {
                if (url[0]==='_') continue;
                var urlinfo=links[url];
                var title;
                if (typeof urlinfo === 'string') title=urlinfo;
                else title=urlinfo.title;
                addLink(form,url,title);}}
        if (gloss) detail_elt.value=gloss.detail||"";
        if ((gloss)&&(gloss.share)) {
            var share=gloss.share;
            if (typeof share === 'string') share=[share];
            var share_i=0; var share_lim=share.length;
            while (share_i<share_lim)
                addTag(form,share[share_i++],"SHARE");}
        if ((!(response))&&(gloss)&&(gloss._id)) {
            uuidelt.value=gloss._id;}
        else uuidelt.value=fdjtState.getUUID(metaBook.nodeid);
        if (gloss) {
            // Set the default outlets to unchecked before
            //  adding/setting the assigned outlets.
            resetOutlets(form);
            var shared=((gloss)&&(gloss.shared))||[];
            if (typeof shared === 'string') shared=[shared];
            var outlet_i=0, n_outlets=shared.length;
            while (outlet_i<n_outlets)
                addOutlet(form,shared[outlet_i++],"SHARE",true);
            var private_span=getChild(form,".private");
            setCheckSpan(private_span,gloss.private);}
        if (((gloss)&&(gloss.excerpt)))
            metaBook.setExcerpt(form,gloss.excerpt,gloss.exoff);
        var cancel_button=fdjtDOM.getChild(form,".cancelbutton");
        if (cancel_button)
            fdjtDOM.addListener(
                cancel_button,"click",cancelGloss_handler);
        form.setAttribute("sbooksetup","yes");
        updateForm(form);
        var container=getParent(form,".metabookglossform");
        if (container) dropClass(container,"modified");
        return form;}

    /***** Setting the gloss target ******/

    // The target can be either a passage or another gloss
    function setGlossTarget(target,form,selecting){
        if (Trace.glossing)
            fdjtLog("setGlossTarget %o form=%o selecting=%o",
                    target,form,selecting);
        if (metaBook.glosstarget) {
            dropClass(metaBook.glosstarget,"mbglosstarget");}
        dropClass("METABOOKHUD",/\bgloss\w+\b/);
        dropClass("METABOOKHUD","editgloss");
        if (!(target)) {
            var cur=fdjtID("METABOOKLIVEGLOSS");
            if (cur) cur.id="";
            metaBook.glosstarget=false;
            metaBook.glossform=false;
            setSelecting(false);
            return;}
        var gloss=false;
        // Identify when the target is a gloss
        if ((typeof target === 'string')&&(mbID(target))) 
            target=mbID(target);
        else if ((typeof target === 'string')&&
                 (metaBook.glossdb.probe(target))) {
            gloss=metaBook.glossdb.ref(target);
            target=mbID(gloss.frag);}
        else if (target._db===metaBook.glossdb) {
            gloss=target; target=mbID(gloss.frag);}
        else {}
        if ((gloss)&&(form)&&(!(form.nodeType))) {
            // Passing a non-false non-node as a form forces a
            // response, even if the user is the maker of the gloss
            form=getGlossForm(gloss,true);}
        // Handle or create the form
        if (form) {
            var frag=fdjtDOM.getInput(form,"FRAG");
            if (frag.value!==target.id) {
                setExcerpt(form,false);
                fdjtDOM.addClass(form,"modified");
                frag.value=target.id;}}
        else {
            if (gloss) form=getGlossForm(gloss);
            else form=getGlossForm(target);
            if (!(form)) {
                fdjtUI.alert("There was a problem adding a gloss");
                return false;}}
        metaBook.glosstarget=target;
        // Reset this when we actually get a gloss
        metaBook.select_target=false;
        addClass(target,"mbglosstarget");
        if (gloss.exoff)
            metaBook.GoTo({target: target,offset: gloss.exoff},"addgloss",true);
        else metaBook.GoTo(target,"addgloss",true);
        metaBook.setCloudCuesFromTarget(metaBook.gloss_cloud,target);
        setGlossForm(form);
        // Clear current selection and set up new selection
        setSelecting(false);
        metaBook.clearHighlights(target);
        if (selecting) setSelecting(selecting);
        else setSelecting(selectText(target));
        if ((gloss)&&(gloss.excerpt)&&(gloss.excerpt.length))
            metaBook.selecting.setString(gloss.excerpt);
        else if (selecting) 
            updateExcerpt(form,selecting);
        else {}
        metaBook.selecting.onchange=function(){
            updateExcerpt(form,this);};
        return form;}
    metaBook.setGlossTarget=setGlossTarget;

    function glossModified(arg){
        var target=((arg.nodeType)?(arg):(fdjtUI.T(arg)));
        var form=getParent(target,"FORM");
        var div=getParent(form,".metabookglossform");
        if (div) addClass(div,"modified");}

    function setSelecting(selecting){
        if (metaBook.selecting===selecting) return;
        else if (metaBook.selecting) {
            if ((Trace.selection)||(Trace.glossing))
                fdjtLog("setSelecting, replacing %o with %o",
                        metaBook.selecting,selecting);
            metaBook.selecting.clear();}
        else {}
        metaBook.selecting=selecting;}
    metaBook.setSelecting=setSelecting;

    function updateExcerpt(form,sel){
        var info=sel.getInfo();
        if ((Trace.glossing)||(Trace.selection))
            fdjtLog("Updating excerpt for %o from %o: %s",
                    form,sel,sel.getString());
        if (!(info)) {
            metaBook.setExcerpt(form,false);
            return;}
        metaBook.setExcerpt(form,info.string,info.off);
        var start_target=getTarget(info.start,true);
        var new_target=((start_target)&&
                        (!(hasParent(metaBook.glosstarget,start_target)))&&
                        (new_target));
        if (new_target) {
            // When real_target is changed, we need to get a new EXOFF
            //  value, which we should probably get by passing real_target
            //  to a second call to getInfo (above)
            var input=fdjtDOM.getInput(form,"FRAG");
            input.value=new_target.id;
            if ((sel)&&(typeof info.off === "number")) {
                var offinput=fdjtDOM.getInput(form,"EXOFF");
                var newoff=sel.getOffset(new_target);
                offinput.value=newoff;}}}

    function selectText(passages,opts){
        if (passages.nodeType) passages=[passages];
        var dups=[];
        var i=0, lim=passages.length;
        while (i<lim) dups=dups.concat(metaBook.getDups(passages[i++]));
        if ((Trace.selection)||(Trace.glossing))
            fdjtLog("selectText %o, dups=%o",passages,dups);
        return new fdjt.UI.TextSelect(
            dups,{ontap: gloss_selecting_ontap,
                  onrelease: ((opts)&&(opts.onrelease)),
                  onslip: ((opts)&&(opts.onslip)),
                  fortouch: metaBook.touch,
                  holdthresh: 150,
                  movethresh: 250});}
    metaBook.UI.selectText=selectText;

    function gloss_selecting_ontap(evt){
        evt=evt||window.event;
        if ((Trace.selection)||(Trace.glossing)||(Trace.gestures))
            fdjtLog("gloss_selecting_ontap %o, mode=%o, livegloss=%o",
                    evt,metaBook.mode,fdjt.ID("METABOOKLIVEGLOSS"));
        if (metaBook.mode!=="addgloss") 
            metaBook.setMode("addgloss",false);
        else if ((metaBook.modechange)&&
                 ((fdjtTime()-metaBook.modechange)<1500)) {}
        else metaBook.setHUD(false);
        fdjtUI.cancel(evt);
        return;}

    function setGlossForm(form){
        var cur=fdjtID("METABOOKLIVEGLOSS");
        if (cur) cur.id="";
        if (Trace.glossing)
            fdjtLog("setGlossForm %o <== %o",form,metaBook.glossform);
        if (!(form)) {
            metaBook.glossform=false;
            return;}
        form.id="METABOOKLIVEGLOSS";
        metaBook.glossform=form;
        fdjt.ID("METABOOKGLOSSBODYTEXT").value=
            fdjtDOM.getInputValue(form,"DETAIL")||"";
        var syncelt=getInput(form,"SYNC");
        syncelt.value=(metaBook.syncstamp+1);
        /* Do completions based on those input's values */
        metaBook.share_cloud.complete();
        metaBook.gloss_cloud.complete();}
    metaBook.setGlossForm=setGlossForm;

    function updateForm(form){
        var glossetc=getChild(form,".glossetc");
        fdjtUI.Overflow(glossetc);}

    function getTagline(target){
        var attrib=
            target.getAttributeNS("tagline","https://sbooks.net/")||
            target.getAttribute("data-tagline")||
            target.getAttribute("tagline");
        if (attrib) return attrib;
        var text=fdjtDOM.textify(target);
        if (!(text)) return false;
        text=fdjtString.stdspace(text);
        if (text.length>40) return text.slice(0,40)+"...";
        else return text;}
    
    /***** Adding outlets ******/

    function addOutlet(form,outlet,formvar,checked) {
        if (typeof checked === 'undefined') checked=true;
        var wrapper=getParent(form,".metabookglossform");
        addClass(wrapper,"modified");
        if (Trace.glossing)
            fdjtLog(
                "addOutlet wrapper=%o form=%o outlet=%o formvar=%o checked=%o",
                wrapper,form,outlet,formvar,checked);
        var outletspan=getChild(form,".outlets");
        var outlet_id=((typeof outlet === 'string')?(outlet):(outlet._id));
        if (typeof outlet === 'string') {
            if ((outlet[0]==='@')||
                ((outlet[0]===':')&&(outlet[0]==='@')))
                outlet=metaBook.sourcedb.ref(outlet);
            else {
                outlet={name: outlet};
                spanspec="span.checkspan.email";
                if (!(formvar)) formvar="EMAIL";}}
        else if (outlet.nodeType) {
            if (!(formvar)) formvar="NETWORK";
            outlet_id=outlet.getAttribute("data-value");
            outlet={name: outlet.getAttribute("data-key")||outlet_id};}
        else {}
        if (!(formvar)) formvar="SHARE";
        var inputs=getInputs(form,formvar);
        var i=0; var lim=inputs.length;
        while (i<lim) {
            if (inputs[i].value===outlet_id) {
                var current_checkspan=getParent(inputs[i],".checkspan");
                setCheckSpan(current_checkspan,checked);
                return current_checkspan;}
            else i++;}
        var spanspec=(
            "span.checkspan.waschecked.ischecked.outlet."+
                formvar.toLowerCase());
        var checkspan=fdjtUI.CheckSpan(
            spanspec,formvar||"SHARE",outlet_id,checked,
            fdjtDOM.Image(mbicon("share",32,32),"img.share","↣"),
            outlet.nick||outlet.name,
            fdjtDOM.Image(mbicon("redx",32,32),"img.redx","x"));
        if ((outlet.nick)&&(outlet.description))
            checkspan.title=outlet.name+": "+outlet.description;
        else if (outlet.description)
            checkspan.title=outlet.description;
        else checkspan.title=outlet.name;
        fdjtDOM(outletspan,checkspan," ");
        dropClass(outletspan,"empty");
        return checkspan;}
    metaBook.addOutlet2Form=addOutlet;

    function clearOutlets(form){
        var outletspan=getChild(form,".outlets");
        fdjtDOM.replace(outletspan,fdjtDOM("span.outlets"));}
    function resetOutlets(form){
        var outletspan=getChild(form,".outlets");
        var outlets=getChildren(outletspan,".checkspan");
        var i=0, lim=outlets.length;
        while (i<lim) {
            var span=outlets[i++];
            setCheckSpan(span,false);}}
    
    /***** Adding links ******/
    
    function addLink(form,url,title) {
        var linkselt=getChild(form,'.links');
        var linkval=((title)?(url+" "+title):(url));
        var img=fdjtDOM.Image(mbicon("diaglink",64,64),"img");
        var anchor=fdjtDOM.Anchor(url,"a.glosslink",((title)||url));
        var checkbox=fdjtDOM.Checkbox("LINKS",linkval,true);
        var aspan=fdjtDOM("span.checkspan.ischecked.waschecked.anchor",
                          img,checkbox,anchor,
                          fdjtDOM.Image(mbicon("redx",32,32),"img.redx","x"));
        var wrapper=getParent(form,".metabookglossform");
        if (Trace.glossing)
            fdjtLog(
                "addOutlet wrapper=%o form=%o url=%o title=%o",
                wrapper,form,url,title);
        addClass(wrapper,"modified");
        aspan.title=url; anchor.target='_blank';
        fdjtDOM(linkselt,aspan," ");
        dropClass(linkselt,"empty");
        updateForm(form);
        return aspan;}
    metaBook.addLink2Form=addLink;

    /***** Adding excerpts ******/
    
    function setExcerpt(form,excerpt,off) {
        var wrapper=getParent(form,".metabookglossform");
        var excerpt_span=getChild(form,'.excerpt'), changed=false;
        var input=getInput(form,'EXCERPT'), exoff=getInput(form,'EXOFF');
        if ((!(excerpt))||(fdjtString.isEmpty(excerpt))) {
            if (input.value) changed=true;
            input.value=""; exoff.value="";
            input.disabled=exoff.disabled=true;
            if (excerpt_span) excerpt_span.innerHTML="";}
        else {
            input.disabled=exoff.disabled=false;
            input.value=excerpt; changed=true;
            if (typeof off === "number") exoff.value=off;
            else {exoff.value="";exoff.disabled=true;}
            if (excerpt_span) {
                excerpt_span.innerHTML=trim_excerpt(excerpt);
                excerpt_span.title=excerpt;}}
        if ((Trace.glossing)||(Trace.selecting))
            fdjtLog("setExcerpt %o form=%o excerpt=%o off=%o",
                    wrapper,form,excerpt,off);
        updateForm(form);
        if (changed) addClass(wrapper,"modified");
        return;}
    metaBook.setExcerpt=setExcerpt;

    function trim_excerpt(string,lim){
        var len=string.length; if (!(lim)) lim=20; 
        if (len<lim) return string;
        var words=string.split(/\s+/), nwords=words.length;
        if (words.length<3)
            return (string.slice(0,Math.floor(lim/2))+"..."+
                    string.slice(Math.floor(len-(lim/2))));
        var left=1, left_len=words[0].length+1;
        var right=nwords-2, right_len=words[nwords-1].length+1;
        while ((left<right)&&((left_len+right_len)<lim)) {
            left_len+=words[left++].length;
            right_len+=words[right--].length;}
        return words.slice(0,left).join(" ")+"..."+
            words.slice(right).join(" ");}

    /***** Adding tags ******/

    function addTag(form,tag,varname,checked,knodule) {
        // fdjtLog("Adding %o to tags for %o",tag,form);
        var prefix=false;
        if (!(tag)) tag=form;
        if (tag.prefix) {prefix=tag.prefix; tag=tag.tag;}
        if (form.tagName!=='FORM')
            form=getParent(form,'form')||form;
        if (!(knodule)) knodule=metaBook.getMakerKnodule(metaBook.user);
        if (typeof checked==="undefined") checked=true;
        var wrapper=getParent(form,".metabookglossform");
        if (Trace.glossing)
            fdjtLog(
                "AddTag %o form=%o tag=%o var=%o checked=%o kno=%o",
                wrapper,form,tag,varname,checked,knodule);
        addClass(wrapper,"modified");
        var tagselt=getChild(form,'.tags');
        var title=false; var textspec='span.term';
        if (!(varname)) varname='TAGS';
        if ((tag.nodeType)&&(hasClass(tag,'completion'))) {
            if (hasClass(tag,'outlet')) {
                varname='SHARED'; textspec='span.outlet';}
            else if (hasClass(tag,'source')) {
                varname='SHARE'; textspec='span.source';}
            else {}
            if (tag.title) title=tag.title;
            tag=metaBook.gloss_cloud.getValue(tag);}
        var ref=
            ((tag instanceof Ref)?(tag):
             ((typeof tag === 'string')&&
              (knodule.handleSubjectEntry(tag))));
        var text=
            ((ref)?
             (((ref.toHTML)&&(ref.toHTML()))||
              ref.name||ref.dterm||ref.title||ref.norm||
              ((typeof ref.EN === "string")||(ref.EN))||
              ((ref.EN instanceof Array)||(ref.EN[0]))||
              ref._qid||ref._id):
             (typeof tag === "string")?(tag):
             (tag.toString()));
        var tagval=tag;
        if (ref) {
            if (ref.knodule===knodule) tagval=ref.dterm;
            else tagval=ref._qid||ref.getQID();}
        if (prefix) tagval=prefix+tagval;
        if ((ref)&&(ref._db===metaBook.sourcedb)) varname='SHARED';
        var checkspans=getChildren(tagselt,".checkspan");
        var i=0; var lim=checkspans.length;
        while (i<lim) {
            var cspan=checkspans[i++];
            if (((cspan.getAttribute("data-varname"))===varname)&&
                ((cspan.getAttribute("data-tagval"))===tagval)) {
                if (checked) addClass(cspan,"waschecked");
                return cspan;}}
        var span=fdjtUI.CheckSpan("span.checkspan",varname,tagval,checked);
        if (checked) addClass(span,"waschecked");
        if (title) span.title=title;
        span.setAttribute("data-varname",varname);
        span.setAttribute("data-tagval",tag);
        addClass(span,("glosstag"));
        addClass(span,((varname.toLowerCase())+"var"));
        if (typeof text === 'string')
            fdjtDOM.append(span,fdjtDOM(textspec,text));
        else fdjtDOM.append(span,text);
        fdjtDOM.append(
            span,fdjtDOM.Image(mbicon("redx",32,32),"img.redx","x"));
        fdjtDOM.append(tagselt,span," ");
        dropClass(tagselt,"empty");
        updateForm(form);
        return span;}
    metaBook.addTag2Form=addTag;

    metaBook.setGlossNetwork=function(form,network,checked){
        if (typeof form === 'string') form=fdjtID(form);
        if (!(form)) return;
        var input=getInput(form,'NETWORKS',network);
        if (!(input)) return;
        var cs=getParent(input,".checkspan");
        if (!(cs)) return;
        setCheckSpan(cs,checked);};

    /* Text handling for the gloss text input */

    // An inline tag is of the form #<txt> or @<txt> where <txt> is
    //  either
    //  1. a word without spaces or terminal punctuation
    //  2. a string wrapped in delimiters, including
    //      "xx" 'yy' /zz/ [ii] (jj) {kk} «aa»
    var tag_delims={"\"": "\"", "'": "'", "/": "/","<":">",
                    "[": "]","(":")","{":"}","«":"»"};
    var tag_ends=/["'\/\[(<{}>)\]«»]/g;
    
    // Keep completion calls from clobbering one another
    var glossinput_timer=false;
    
    // Find the tag overlapping pos in string
    // Return a description of the tag
    function findTag(string,pos,partialok,nospaces){
        if ((string)&&(string.length)&&(pos>0)) {
            var space=false, start=pos-1, delim=false, need=false;
            var c=string[start], pc=string[start-1], cstart=start;
            while (start>=0) {
                if (pc==='\\') {}
                else if (/\s/.test(c)) space=start;
                else if ((c==='@')||(c==='#')) break;
                else if (start===0) return false;
                start--; c=pc; pc=string[start-1];}
            var prefix=string[start];
            var sc=string[start+1], end=string.length;
            if (tag_delims[sc]) {
                var matching=tag_delims[sc]; delim=sc; cstart=start+2;
                var match_off=string.slice(start+2).indexOf(matching);
                if (match_off<0) {
                    if (partialok) {end=pos; need=matching;}
                    else return false;}
                else end=start+2+match_off;
                if (end<pos) return false;}
            else if ((nospaces)&&(space)) return false;
            else {
                var end_off=string.slice(start).search(tag_ends);
                if (end_off>0) end=start+end_off;
                cstart=start+1;}
            var result={text: string.slice(start,end),
                        start: start,end: end,pos: pos,prefix: prefix,
                        content: (((delim)&&(need))?(string.slice(start+2,end)):
                                  (delim)?(string.slice(start+2,end-1)):
                                  (string.slice(start+1,end)))};
            if (delim) result.delim=delim;
            if ((delim)&&(partialok)) result.needs=tag_delims[delim];
            return result;}
        else return false;}
    metaBook.findTag=findTag;

    function tagclear(input_elt,pos){
        var text=input_elt.value;
        if (!(pos)) pos=input_elt.selectionStart;
        var info=findTag(text,pos);
        if (info) {
            input_elt.value=
                text.slice(0,info.start)+text.slice(info.end);}}

    function glossinput_onfocus(evt){
        var target=fdjtUI.T(evt);
        var text=target.value;
        var pos=target.selectionStart;
        var taginfo=findTag(text,pos);
        if ((Trace.glossing)||(Trace.gestures))
            fdjtLog("glossinput_onfocus %o text=%o pos=%o taginfo=%o",
                    evt,text,pos,taginfo);
        glossform_focus(evt);
        if (!(taginfo)) return;
        if (glossinput_timer) clearTimeout(glossinput_timer);
        glossinput_timer=setTimeout(function(){
            glosstag_complete(target);},150);}

    function glossinput_onkeypress(evt){
        var target=fdjtUI.T(evt), form=getParent(target,"FORM");
        var text=target.value, pos=target.selectionStart||0;
        var ch=evt.charCode, charstring=String.fromCharCode(ch);
        var taginfo=findTag(text,pos,true);

        if ((Trace.glossing)||(Trace.gestures>2))
            fdjtLog("glossinput_onkeypress '%o' %o text=%o pos=%o taginfo=%o",
                    ch,evt,text,pos,taginfo);
        if (ch!==13) {
            addClass(getParent(form,".metabookglossform"),"focused");
            addClass(getParent(form,".metabookglossform"),"modified");}
        if (ch===13) {
            if (taginfo) {
                // Remove tag text
                target.value=text.slice(0,taginfo.start)+
                    text.slice(taginfo.end);
                // Add a selection or tag as appropriate
                glosstag_done(target,taginfo.content,evt.ctrlKey,
                              taginfo.prefix==="@");
                fdjt.UI.cancel(evt);}
            else if (evt.shiftKey) {
                target.value=text.slice(0,pos)+"\n"+text.slice(pos);
                target.selectionStart++;
                return fdjtUI.cancel(evt);}
            else {
                fdjtUI.cancel(evt);
                submitGloss(form);}}
        else if (!(taginfo)) {}
        else if (tag_ends.test(charstring)) {
            // Handles tag closing, which is an implicit add tag
            taginfo=findTag(text,pos,true);
            if (!(taginfo)) return;
            else if (taginfo.needs===charstring) {
                target.value=text.slice(0,taginfo.start)+
                    text.slice(taginfo.end);
                glosstag_done(target,taginfo.content,evt.ctrlKey,
                              taginfo.prefix==="@");
                fdjtUI.cancel(evt);}
            else {}
            return;}
        else {
            if (glossinput_timer) clearTimeout(glossinput_timer);
            glossinput_timer=setTimeout(function(){
                glosstag_complete(target);},
                                        150);}}

    function glossinput_onkeydown(evt){
        var ch=evt.keyCode, target=fdjtUI.T(evt);
        if (ch===27) {
            metaBook.cancelGloss(); fdjtUI.cancel(evt);
            return;}
        else if ((ch===9)||(ch===13)) {
            var form=getParent(target,"FORM"), text=target.value;
            var pos=target.selectionStart||0, taginfo=findTag(text,pos,true);
            var cloud=((taginfo.prefix==="@")?
                       (metaBook.share_cloud):
                       (metaBook.gloss_cloud));
            if ((Trace.glossing)||(Trace.gestures>2))
                fdjtLog("glossinput_onkeydown '%o' %o taginfo=%o cloud=%o",
                        ch,evt,taginfo,cloud);
            if (!(taginfo)) return;
            else if (ch===9) {
                var content=taginfo.content;
                cloud.complete(content);
                if ((cloud.prefix)&&(cloud.prefix!==content)) {
                    var replace_start=taginfo.start+((taginfo.delim)?(2):(1));
                    var replace_end=taginfo.end-((taginfo.needs)?(0):(1));
                    if (cloud.prefix.search(/\s/)>=0)
                        target.value=text.slice(0,replace_start)+
                        ((taginfo.delim)?(""):("\""))+cloud.prefix+
                        ((taginfo.needs)?(taginfo.needs):(""))+
                        text.slice(replace_end);
                    else target.value=
                        text.slice(0,replace_start)+cloud.prefix+
                        text.slice(replace_end);
                    setTimeout(function(){
                        metaBook.UI.updateScroller("METABOOKGLOSSCLOUD");},
                               100);
                    return;}
                else if (evt.shiftKey) cloud.selectPrevious();
                else cloud.selectNext();
                fdjtUI.cancel(evt);}
            else if (cloud.selection) {
                if (taginfo.prefix==="@") {
                    var outlet=cloud.selection.getAttribute("data-value");
                    metaBook.addOutlet2Form(form,outlet,"SHARE");}
                else metaBook.addTag2Form(form,cloud.selection);
                target.value=text.slice(0,taginfo.start)+
                    text.slice(taginfo.end);
                dropClass("METABOOKHUD",/gloss(tagging|tagoutlet)/g);
                setTimeout(function(){cloud.complete("");},10);
                cloud.clearSelection();
                fdjtUI.cancel(evt);}
            else {}}
        else if ((ch===8)||(ch===46)||((ch>=35)&&(ch<=40))) {
            // These may change content, so we update the completion state
            glossModified(evt);
            if (glossinput_timer) clearTimeout(glossinput_timer);
            glossinput_timer=setTimeout(function(){
                glosstag_complete(target);},150);}}

    function glosstag_complete(input_elt){
        var text=input_elt.value;
        var pos=input_elt.selectionStart||0;
        var taginfo=findTag(text,pos,true);
        if (taginfo) {
            var completions;
            var isoutlet=(taginfo.prefix==="@");
            if (isoutlet)
                swapClass(
                    "METABOOKHUD",/gloss(tagging|tagoutlet)/g,"glosstagoutlet");
            else swapClass(
                "METABOOKHUD",/gloss(tagging|tagoutlet)/g,"glosstagging");
            if (isoutlet)
                completions=metaBook.share_cloud.complete(taginfo.content);
            else completions=metaBook.gloss_cloud.complete(taginfo.content);
            if (Trace.glossing)
                fdjtLog("Got %d completions for %s",
                        completions.length,taginfo.content);}
        else dropClass("METABOOKHUD",/gloss(tagging|addoutlet)/g);}

    function glosstag_done(input_elt,tagtext,personal,isoutlet){
        var form=getParent(input_elt,"FORM"), tag=false;
        if ((!(isoutlet))&&(personal)) 
            tag=metaBook.knodule.def(tagtext);
        else if (tagtext.indexOf('|')>0) {
            if (isoutlet) 
                fdjtLog.warn("Can't define outlets (sources) from %s",tagtext);
            else tag=metaBook.knodule.def(tagtext);}
        else {
            var cloud=((isoutlet)?(metaBook.share_cloud):(metaBook.gloss_cloud));
            var completions=cloud.complete(tagtext);
            if (completions.length===0) {}
            else if (completions.length===1) tag=completions[0];
            else {}
            if ((isoutlet)&&(!(tag))) 
                fdjtLog.warn("Unknown outlet %s",tagtext);
            else if (isoutlet) addOutlet(form,tag);
            else if (!(tag)) {
                tag=metaBook.knodule.ref(tagtext);
                if (tag) addTag(form,tag);
                else addTag(form,tagtext);}
            else addTag(form,tag);}
        dropClass("METABOOKHUD",/gloss(tagging|addoutlet)/);}
    
    function getTagString(span,content){
        var tagval=span.getAttribute("data-tagval");
        if (tagval) {
            var at=tagval.indexOf('@');
            if ((metaBook.knodule)&&(at>0)&&
                (tagval.slice(at+1)===metaBook.knodule.name))
                return tagval.slice(0,at);
            else return tagval;}
        else {
            var bar=content.indexOf('|');
            if (bar>0) return content.slice(0,bar);
            else return content;}}

    var stdspace=fdjtString.stdspace;

    function handleTagInput(tagstring,form,exact){
        var isoutlet=(tagstring[0]==="@");
        var cloud=((isoutlet)?(metaBook.share_cloud):(metaBook.gloss_cloud));
        var text=(((tagstring[0]==='@')||(tagstring[0]==='#'))?
                  (tagstring.slice(1)):(tagstring));
        var completions=cloud.complete(text);
        var std=stdspace(text);
        if (isoutlet) {
            var oc=[]; var j=0, jlim=completions.length; while (j<jlim) {
                var c=completions[j++];
                if (hasClass(c,"outlet")) oc.push(c);}
            completions=oc;}
        if ((!(completions))||(completions.length===0)) {
            if (isoutlet) addOutlet(form,std); // Should probably just warn
            else addTag(form,std);
            cloud.complete("");
            return std;}
        else {
            var completion=false;
            if (completions.length===1)
                completion=completions[0];
            else if ((completions.exact)&&
                     (completions.exact.length===1))
                completion=completions.exact[0];
            else {
                // Multiple completions
                completion=completions[0];
                var i=0, lim=completions.length;
                while (i<lim) {
                    var mc=completions[i++];
                    if (mc!==completion) {completion=false; break;}}}
            if ((completion)&&(completion===completions[0])) {
                var ks=metaBook.gloss_cloud.getKey(completions.matches[0]);
                if ((exact)?(ks.toLowerCase()!==std.toLowerCase()):
                    (ks.toLowerCase().search()!==0)) {
                    // When exact is true, count on exact matches;
                    // even if it is false, don't except non-prefix
                    // matches
                    addTag(form,std);
                    metaBook.gloss_cloud.complete("");
                    return std;}}
            if (completion) {
                var span=addTag(form,completion);
                metaBook.gloss_cloud.complete("");
                return getTagString(span,metaBook.gloss_cloud.getKey(completion));}
            else {
                addTag(form,std);
                metaBook.gloss_cloud.complete("");
                return std;}}}
    metaBook.handleTagInput=handleTagInput;

    function get_addgloss_callback(form,keep,uri){
        return function(req){
            return addgloss_callback(req,form,keep,uri);};}

    function addgloss_callback(req,form,keep){
        if ((Trace.network)||(Trace.glossing))
            fdjtLog("Got AJAX gloss response %o from %o",req,req.uri);
        if (Trace.savegloss)
            fdjtLog("Gloss %o successfully added (status %d) to %o",
                    getInput(form,"UUID").value,req.status,
                    getInput(form,"FRAG").value);
        dropClass(form.parentNode,"submitting");
        if (keep)
            addClass(form.parentNode,"submitdone");
        else addClass(form.parentNode,"submitclose");
        var json=JSON.parse(req.responseText);
        var ref=metaBook.glossdb.Import(
            // item,rules,flags
            json,false,((RefDB.REFINDEX)|(RefDB.REFSTRINGS)|(RefDB.REFLOAD)));
        var reps=document.getElementsByName(ref._id);
        var i=0, lim=reps.length;
        while (i<lim) {
            var rep=reps[i++];
            if (hasClass(rep,"metabookcard")) {
                var new_card=metaBook.renderCard(ref);
                if (new_card) fdjtDOM.replace(rep,new_card);}}
        ref.save();
        if (metaBook.selecting) {
            if (metaBook.selecting.onclear)
                metaBook.selecting.onclear.push(function(){
                    metaBook.addGloss2UI(ref);});
            else metaBook.selecting.onclear=[function(){
                metaBook.addGloss2UI(ref);}];}
        /* Turn off the target lock */
        if ((form)&&(!(keep))) {
            setTimeout(function(){
                if (hasClass(form.parentNode,"submitclose")) {
                    if ((form.parentNode)&&(form.parentNode))
                        fdjtDOM.remove(form.parentNode);
                    setGlossTarget(false);
                    metaBook.setTarget(false);
                    metaBook.setMode(false);}},
                       1500);}
        else if (form)
            setTimeout(function(){
                dropClass(form.parentNode,"submitdone");},
                       1500);
        else {}}

    function clearGlossForm(form){
        // Clear the UUID, and other fields
        var uuid=getInput(form,"UUID");
        if (uuid) uuid.value="";
        var note=getInput(form,"NOTE");
        if (note) note.value="";
        var href=getInput(form,"HREF");
        if (href) href.value="";
        var tagselt=getChildren(form,".tags");
        if ((tagselt)&&(tagselt.length)) {
            var tags=getChildren(tagselt[0],".checkspan");
            fdjtDOM.remove(fdjtDOM.Array(tags));}}

    /***** The Gloss Cloud *****/

    function glosscloud_select(evt){
        var target=fdjtUI.T(evt);
        var completion=getParent(target,'.completion');
        if (completion) {
            var live=fdjtID("METABOOKLIVEGLOSS");
            var form=((live)&&(getChild(live,"form")));
            var span=addTag(form,completion);
            if (!(hasClass("METABOOKHUD","glossaddtag"))) {
                // This means we have a bracketed reference
                var tagstring=getTagString(
                    span,metaBook.gloss_cloud.getKey(completion));
                var input=getInput(form,"NOTE");
                if ((input)&&(tagstring)) tagclear(input);}}
        fdjtUI.cancel(evt);}
    metaBook.UI.handlers.glosscloud_select=glosscloud_select;

    /***** The Outlet Cloud *****/

    function sharecloud_ontap(evt){
        var target=fdjtUI.T(evt);
        var completion=getParent(target,'.completion');
        if (completion) {
            var live=fdjtID("METABOOKLIVEGLOSS");
            var form=((live)&&(getChild(live,"form")));
            var value=completion.getAttribute("data-value");
            if (hasClass(completion,"source")) {
                if (value) addOutlet(form,metaBook.sourcedb.ref(value),"SHARE");}
            else if (hasClass(completion,"network")) 
                addOutlet(form,completion,"NETWORK");
            else if (hasClass(completion,"email")) 
                if (value) addOutlet(form,completion,"EMAIL");
            else addOutlet(form,completion);}
        fdjtUI.cancel(evt);}
    metaBook.UI.sharecloud_ontap=sharecloud_ontap;

    /***** Saving (submitting/queueing) glosses *****/

    var login_message=false;

    // Submits a gloss, queueing it if offline.
    function submitGloss(arg,keep){
        var div=false, form=false;
        if (typeof arg === "undefined") {
            div=fdjtID("METABOOKLIVEGLOSS");
            if (!(div)) return;
            form=getChild(div,"FORM");}
        else {
            if (!(arg.nodeType)) arg=fdjtUI.T(arg);
            if ((arg.nodeType)&&(arg.nodeType===1)&&
                (arg.tagName==="FORM")) {
                form=arg; div=getParent(form,".metabookglossform");}
            else if ((arg.nodeType)&&(arg.nodeType===1)&&
                     (arg.tagName==="DIV")&&(hasClass(arg,"metabookglossform"))) {
                div=arg; form=getChild(div,"FORM");}}
        if (!(form)) return;
        var detail_elt=getInput(form,"DETAIL");
        var glossbodytext=fdjtID("METABOOKGLOSSBODYTEXT");
        detail_elt.value=glossbodytext.value||"";
        addClass(div,"submitting");
        if (!((hasParent(form,".glossedit"))||
              (hasParent(form,".glossreply"))))
            // Only save defaults if adding a new gloss
            saveGlossDefaults(
                form,getChild("METABOOKADDGLOSSPROTOTYPE","FORM"));
        var uuidelt=getInput(form,"UUID");
        if (!((uuidelt)&&(uuidelt.value)&&(uuidelt.value.length>5))) {
            fdjtLog.warn('missing UUID');
            if (uuidelt) uuidelt.value=fdjtState.getUUID(metaBook.nodeid);}
        var note_input=getInputs(form,"NOTE")[0];
        if (note_input.value.search(uri_prefix)===0) {
            // This is a convenience kludge where notes that look like
            // URLs are stored as links.
            var note=note_input.value;
            var brk=note.search(/\s/);
            if (brk<0) addLink(form,note);
            else addLink(form,note.slice(0,brk),note.slice(brk+1));
            note_input.value="";}
        if ((!(login_message))&&
            ((!(navigator.onLine))||(!(metaBook.connected)))) {
            var choices=[];
            if (navigator.onLine) 
                choices.push({label: "Login",
                              isdefault: true,
                              handler: function(){
                                  setTimeout(function()
                                             {metaBook.setMode("login");},0);
                                  var resubmit=function(){
                                      submitGloss(form,keep);};
                                  if (metaBook._onconnect)
                                      metaBook._onconnect.push(resubmit);
                                  else metaBook._onconnect=[resubmit];
                                  login_message=true;}});
            if ((metaBook.user)&&(metaBook.persist)) 
                choices.push({label: "Queue",
                              isdefault: ((!(navigator.onLine))&&
                                          (metaBook.cacheglosses)),
                              handler: function(){
                                  if (metaBook.nocache)
                                      metaBook.setConfig("cacheglosses",true);
                                  login_message=true;
                                  if (!((navigator.onLine)&&(metaBook.connected)))
                                      queueGloss(form,false,keep);
                                  else submitGloss(form,keep);}});
            else {
                choices.push({label: "Cache",
                              isdefault: ((!(navigator.onLine))&&
                                          (metaBook.cacheglosses)),
                              handler: function(){
                                  if (metaBook.nocache)
                                      metaBook.setConfig("cacheglosses",true,true);
                                  login_message=true;
                                  queueGloss(form,false,keep);}});
                if (metaBook.nocache)
                    choices.push({label: "Lose",
                                  isdefault:((!(navigator.onLine))&&
                                             (metaBook.nocache)),
                                  handler: function(){
                                      tempGloss(form); login_message=true;}});}
            choices.push({label: "Cancel",
                          handler: function(){
                              fdjtDOM.remove(form.parentNode);
                              setGlossTarget(false);
                              metaBook.setTarget(false);
                              metaBook.setMode(false);}});
            fdjtUI.choose(choices,
                          ((navigator.onLine)&&(!(metaBook.user))&&
                           ([fdjtDOM("p.smaller",
                                     "This book isn't currently associated with an sBooks account, ",
                                     "so any highlights or glosses you add will not be permanently saved ",
                                     "until you login."),
                             fdjtDOM("p.smaller",
                                     "You may either login now, cache your changes ",
                                     "on this machine until you do login, ",
                                     "lose your changes when this page closes, ",
                                     "or cancel the change you're about to make.")])),
                          (((navigator.onLine)&&(metaBook.user)&&
                            ([fdjtDOM("p.smaller",
                                      "You aren't currently logged into your sBooks account from ",
                                      "this machine, so any highlights or glosses you add won't ",
                                      "be saved until you do."),
                              fdjtDOM("p.smaller","In addition, you won't get updated glosses from ",
                                      "your networks or layers."),
                              fdjtDOM("p.smaller",
                                      "You may either login now, queue any changes you make until ",
                                      "you do login, or cancel the change you were trying to make.")]))),
                          ((!(navigator.onLine))&&(metaBook.nocache)&&
                           ([fdjtDOM("p.smaller",
                                     "You are currently offline and have elected to not save ",
                                     "highlights or glosses locally on this computer."),
                             fdjtDOM("p.smaller",
                                     "You can either queue your changes by storing information locally, ",
                                     "lose your changes when this page closes,",
                                     "or cancel the change you were about to make.")])));
            return;}
        var sent=((navigator.onLine)&&(metaBook.connected)&&(metaBook.user)&&
                  (fdjt.Ajax.onsubmit(form,get_addgloss_callback(form,keep))));
        if (!(sent)) queueGloss(form,((arg)&&(arg.type)&&(arg)),keep);
        else dropClass(div,"modified");}
    metaBook.submitGloss=submitGloss;

    function cancelGloss_handler(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        cancelGloss(target);
        fdjtUI.cancel(evt);}

    function cancelGloss(arg){
        var evt=arg||window.event||null;
        var target=((!arg)?(fdjtID("METABOOKLIVEGLOSS")):
                    (arg.nodeType)?(arg):(fdjtUI.T(arg)));
        var glossform=(target)&&
            (fdjtDOM.getParent(target,".metabookglossform"));
        setGlossTarget(false);
        metaBook.setMode(false);
        if ((arg)&&((arg.cancelable)||(arg.bubbles))) {
            fdjtUI.cancel(evt);}
        if (glossform) fdjtDOM.remove(glossform);}
    metaBook.cancelGloss=cancelGloss;

    // We save gloss defaults on the prototype gloss form hidden in the DOM
    function saveGlossDefaults(form,proto){
        // Save gloss mode (??)
        var mode=form.className; var i, lim;
        swapClass(proto,glossmodes,mode);
        // Save post setting
        var post=getInput(form,"POSTGLOSS");
        var proto_post=getInput(form,"POSTGLOSS");
        setCheckSpan(proto_post,post.checked);
        // Save network settings
        var networks=getInputs(form,"NETWORKS");
        i=0; lim=networks.length; while (i<lim) {
            var network_input=networks[i++];
            var proto_input=getInputFor(form,"NETWORKS",network_input.value);
            setCheckSpan(proto_input,network_input.checked);}
        // Save outlets
        clearOutlets(proto);
        var shared=getChild(form,".outlets");
        var inputs=getChildren(shared,"INPUT");
        // Here's the logic: we save all checked outlets and any
        // others up to 5.
        i=0; lim=inputs.length; var n_others=0; while (i<lim) {
            var input=inputs[i++];
            if ((input.checked)||(n_others<=5)) {
                var checkspan=addOutlet(
                    proto,input.value,input.name,input.checked);
                if (input.checked) addClass(checkspan,"waschecked");
                else n_others++;}}}

    // These are for glosses saved only in the current session,
    // without using local storage.
    var queued_data={};

    // Queues a gloss when offline
    function queueGloss(form,evt,keep){
        // We use the JSON to update the local database and save the
        // params to send when we get online
        var json=fdjt.Ajax.formJSON(form,true);
        var params=fdjt.Ajax.formParams(form);
        var queued=metaBook.queued;
        queued.push(json.uuid);
        if (metaBook.cacheglosses) {
            fdjtState.setLocal("metabook.params("+json.uuid+")",params);
            fdjtState.setLocal("metabook.queued("+metaBook.refuri+")",queued,true);}
        else queued_data[json.uuid]=params;
        // Now save it to the in-memory database
        var glossdata=
            {refuri: json.refuri,frag: json.frag,
             _id: json.uuid,uuid: json.uuid,
             maker: json.user||metaBook.user,
             qid: json.uuid,gloss: json.uuid,
             created: ((json.created)||(fdjtTime()))};
        glossdata.tstamp=fdjtTime.tick();
        if ((json.note)&&(!(fdjtString.isEmpty(json.note))))
            glossdata.note=json.note;
        if ((json.excerpt)&&(!(fdjtString.isEmpty(json.excerpt)))) {
            glossdata.excerpt=json.excerpt;
            glossdata.exoff=json.exoff;}
        if ((json.detail)&&(!(fdjtString.isEmpty(json.detail))))
            glossdata.detail=json.detail;
        if ((json.tags)&&(json.tags.length>0)) glossdata.tags=json.tags;
        if ((json.xrefs)&&(json.xrefs.length>0)) glossdata.xrefs=json.xrefs;
        metaBook.glossdb.Import(
            glossdata,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,
            true);
        if (evt) fdjtUI.cancel(evt);
        dropClass(form.parentNode,"submitting");
        /* Turn off the target lock */
        if (!(keep)) {
            // Clear the UUID
            clearGlossForm(form);
            setGlossTarget(false);
            metaBook.setTarget(false);
            metaBook.setMode(false);}}

    // Creates a gloss which will go away when the page closes
    function tempGloss(form,evt){
        // We use the JSON to update the local database and save the
        // params to send when we get online
        var json=fdjt.Ajax.formJSON(form,true);
        // save it to the in-memory database
        var glossdata=
            {refuri: json.refuri,frag: json.frag,
             maker: json.user,_id: json.uuid,uuid: json.uuid,
             qid: json.uuid,gloss: json.uuid,
             created: fdjtTime()};
        glossdata.tstamp=fdjtTime.tick();
        if ((json.note)&&(!(fdjtString.isEmpty(json.note))))
            glossdata.note=json.note;
        if ((json.excerpt)&&(!(fdjtString.isEmpty(json.excerpt)))) {
            glossdata.excerpt=json.excerpt;
            glossdata.exoff=json.exoff;}
        if ((json.detail)&&(!(fdjtString.isEmpty(json.detail))))
            glossdata.detail=json.detail;
        if ((json.tags)&&(json.tags.length>0)) glossdata.tags=json.tags;
        if ((json.xrefs)&&(json.xrefs.length>0)) glossdata.xrefs=json.xrefs;
        metaBook.glossdb.Import(glossdata,false,false,true);
        // Clear the UUID
        clearGlossForm(form);
        if (evt) fdjtUI.cancel(evt);
        dropClass(form.parentNode,"submitting");
        /* Turn off the target lock */
        setGlossTarget(false);
        metaBook.setTarget(false);
        metaBook.setMode(false);}

    // Saves queued glosses
    function writeQueuedGlosses(){
        if (metaBook.queued.length) {
            var ajax_uri=getChild(fdjtID("METABOOKADDGLOSSPROTOTYPE"),"form").
                getAttribute("ajaxaction");
            var queued=metaBook.queued; var glossid=queued[0];
            var post_data=((metaBook.nocache)?((queued_data[glossid])):
                           (fdjtState.getLocal("metabook.params("+glossid+")")));
            if (post_data) {
                var req=new XMLHttpRequest();
                req.open('POST',ajax_uri);
                req.withCredentials='yes';
                req.onreadystatechange=function () {
                    if ((req.readyState === 4) &&
                        (req.status>=200) && (req.status<300)) {
                        fdjtState.dropLocal("metabook.params("+glossid+")");
                        var pending=metaBook.queued;
                        if ((pending)&&(pending.length)) {
                            var pos=pending.indexOf(glossid);
                            if (pos>=0) {
                                pending.splice(pos,1);
                                if (metaBook.cacheglosses)
                                    fdjtState.setLocal("metabook.queued("+metaBook.refuri+")",pending,true);
                                metaBook.queued=pending;}}
                        addgloss_callback(req,false,false);
                        if (pending.length) setTimeout(writeQueuedGlosses,200);
                        fdjtState.dropLocal("metabook.queued("+metaBook.refuri+")");}
                    else if (req.readyState===4) {
                        metaBook.setConnected(false);}
                    else {}};
                try {
                    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    req.send(post_data);}
                catch (ex) {metaBook.setConnected(false);}}}}
    metaBook.writeQueuedGlosses=writeQueuedGlosses;
    
    /* Glossform interaction */

    /**** Clicking on outlets *****/
    
    function glossform_outlets_tapped(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (getParent(target,".checkspan"))
            return fdjt.UI.CheckSpan.onclick(evt);
        else if (getParent(target,".sharing"))
            toggleClass(getParent(target,".sharing"),"expanded");
        else {}}
    metaBook.UI.glossform_outlets_tapped=glossform_outlets_tapped;

    function outlet_select(evt){
        var target=fdjtUI.T(evt);
        var outletspan=getParent(target,'.outlet')||
            getParent(target,'.source');
        if (!(outletspan)) return;
        var live=fdjtID("METABOOKLIVEGLOSS");
        var form=((live)&&(getChild(live,"form")));
        var outlet=metaBook.share_cloud.getValue(outletspan);
        metaBook.addOutlet2Form(form,outlet);
        fdjtUI.cancel(evt);}

    /* The addgloss menu */

    var slip_timeout=false;

    function glossmode_tap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alt=target.alt;
        
        if (!(alt)) return;

        var menu=getParent(target,'.addglossmenu');
        var form=getParent(target,'form');
        var div=getParent(form,"div.metabookglossform");
        
        if (alt==="downmenu") {
            addClass(menu,"expanded");
            dropClass(menu,"held");}
        else if (alt==="upmenu") {
            dropClass(menu,"expanded");
            dropClass(menu,"held");}
        else if (alt==="glossdelete") 
            addgloss_delete(menu,form,false,true);
        else if (alt==="glosscancel") 
            addgloss_cancel(menu,form,div);
        else if (alt==="glosspush") {
            metaBook.submitGloss(form,false);
            dropClass(menu,"expanded");}
        else if (alt==="glossupdate") {
            metaBook.submitGloss(form,false);
            dropClass(menu,"expanded");}
        else if (alt==="glossrespond") 
            addgloss_respond(menu,form);
        else if (alt==="glosscancel") {
            addgloss_cancel(menu,form,div);}
        else if (alt===form.className) {
            metaBook.setGlossMode(false,form);
            dropClass(menu,"expanded");}
        else if (metaBook.glossmodes.exec(alt)) {
            metaBook.setGlossMode(alt,form);
            dropClass(menu,"expanded");}
        else fdjtLog.warn("Bad alt=%s in glossmode_tap",alt);
        fdjtUI.cancel(evt);
        return;}

    function glossmode_hold(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alt=target.alt;
        
        if (!(alt)) return;

        if (slip_timeout) {
            clearTimeout(slip_timeout);
            slip_timeout=false;}

        var menu=getParent(target,'.addglossmenu');
        
        if (hasClass(menu,"expanded")) {
            addClass(menu,"held");
            addClass(target,"held");}
        else {
            addClass(menu,"expanded");
            addClass(menu,"held");}}

    function glossmode_release(evt) {
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var menu=getParent(target,'.addglossmenu');
        var form=getParent(target,'form');
        var div=getParent(form,"div.metabookglossform");
        var alt=target.alt;
        dropClass(target,"held");
        if (hasClass(target,"menutop")) {
            metaBook.setGlossMode(false,form);}
        else if (alt==="glossdelete") 
            addgloss_delete(menu,form);
        else if (alt==="glosscancel") 
            addgloss_cancel(menu,form,div);
        else if (alt==="glosspush")
            metaBook.submitGloss(form,false);
        else if (alt==="glossupdate") {
            metaBook.submitGloss(form,false);}
        else if (alt==="glossrespond") 
            addgloss_respond(menu,form);
        else if (metaBook.glossmodes.exec(alt))
            metaBook.setGlossMode(alt,form);
        else fdjtLog.warn("Bad alt=%s in glossmode_release",alt);
        dropClass(menu,"expanded");
        dropClass(menu,"held");}

    function glossmode_slip(evt) {
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var menu=getParent(target,'.addglossmenu');
        dropClass(target,"held");
        if (!(slip_timeout)) {
            slip_timeout=setTimeout(function(){
                dropClass(menu,"expanded");},
                                    500);}}

    function addgloss_delete(menu,form,div,noprompt){
        if (!(form)) form=getParent(menu,"FORM");
        if (!(div)) div=getParent(form,".metabookglossform");
        var modified=fdjtDOM.hasClass(div,"modified");
        // This keeps it from being saved when it loses the focus
        dropClass(div,"modified");
        dropClass(menu,"expanded");
        var uuid=getInputValues(form,"UUID")[0];
        var gloss=metaBook.glossdb.probe(uuid);
        if ((!(gloss))||(!(gloss.created))) {
            delete_gloss(uuid);
            metaBook.setMode(false);
            fdjtDOM.remove(div);
            setGlossTarget(false);
            metaBook.setTarget(false);
            return;}
        if (noprompt) {
            delete_gloss(uuid);
            metaBook.setMode(false);
            fdjtDOM.remove(div);
            setGlossTarget(false);
            metaBook.setTarget(false);
            return;}
        fdjt.UI.choose([{label: "Delete",
                         handler: function(){
                             delete_gloss(uuid);
                             metaBook.setMode(false);
                             fdjtDOM.remove(div);
                             setGlossTarget(false);
                             metaBook.setTarget(false);},
                         isdefault: true},
                        {label: "Cancel"}],
                       ((modified)?
                        ("Delete this gloss?  Discard your changes?"):
                        ("Delete this gloss?")),
                       fdjtDOM(
                           "div.smaller",
                           "(Created ",
                           fdjtTime.shortString(gloss.created),
                           ")"));}

    function addgloss_cancel(menu,form,div){
        if (!(form)) form=getParent(menu,"FORM");
        if (!(div)) div=getParent(form,".metabookglossform");
        metaBook.cancelGloss();
        metaBook.setMode(false);
        fdjtDOM.remove(div);
        setGlossTarget(false);
        metaBook.setTarget(false);
        return;}

    function addgloss_respond(target){
        var block=getParent(target,".metabookglossform");
        if (!(block)) return;
        var glosselt=getInput(block,'UUID');
        if (!(glosselt)) return;
        var qref=glosselt.value;
        var gloss=metaBook.glossdb.probe(qref);
        if (!(gloss)) return;
        var form=setGlossTarget(gloss,metaBook.getGlossForm(gloss,true));
        if (!(form)) return;
        metaBook.setMode("addgloss");}
    
    /* Changing gloss networks */
    
    function changeGlossNetwork(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var alternate=fdjtID(
            (fdjtDOM.hasParent(target,".metabookglossform"))?
                ("METABOOKNETWORKBUTTONS"):(("METABOOKLIVEGLOSS")));
        var doppels=getInputsFor(alternate,'NETWORK',target.value);
        fdjtUI.CheckSpan.set(doppels,target.checked);}
    metaBook.UI.changeGlossNetwork=changeGlossNetwork;

    function changeGlossPosting(evt){
        var target=fdjtUI.T(evt=(evt||window.event));
        var glossdiv=getParent(target,".metabookglossform");
        if (target.checked) fdjtDOM.addClass(glossdiv,"posted");
        else fdjtDOM.dropClass(glossdiv,"posted");}
    metaBook.UI.changeGlossPosting=changeGlossPosting;

    function changeGlossPrivacy(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt=(evt||window.event));
        var glossdiv=getParent(target,".metabookglossform");
        var postgloss=getChild(glossdiv,".postgloss");
        var postinput=(postgloss)&&(getInput(postgloss,"POSTGLOSS"));
        if (postgloss) {
            if (target.checked) {
                if (postinput) postinput.disabled=true;}
            else {
                if (postinput) postinput.disabled=false;}}
        if (target.checked) fdjtDOM.addClass(glossdiv,"private");
        else fdjtDOM.dropClass(glossdiv,"private");}
    metaBook.UI.changeGlossPrivacy=changeGlossPrivacy;

    /* New simpler UI */

    var gloss_focus=false;
    var gloss_blurred=false;
    var gloss_blur_timeout=false;

    function glossform_focus(evt){
        evt=evt||window.event;
        gloss_blurred=false;
        var target=fdjtUI.T(evt);
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (div) {
            metaBook.setGlossMode(false);}
        if (input) metaBook.setFocus(input);
        metaBook.setHUD(true);
        metaBook.freezelayout=true;
        gloss_focus=form;}
    metaBook.UI.glossFormFocus=glossform_focus;
    function glossform_blur(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (div) dropClass(div,"focused");
        if (input) metaBook.clearFocus(input);
        metaBook.setHUD(false,false);
        gloss_blurred=fdjtTime();
        metaBook.freezelayout=false;
        // Restore this without removal of the gloss
        // if ((div)&&(hasClass(div,"modified"))) metaBook.submitGloss(div);
        gloss_focus=false;}
    function glossform_touch(evt){
        evt=evt||window.event;
        if (gloss_blur_timeout) clearTimeout(gloss_blur_timeout);
        var target=fdjtUI.T(evt);
        var closing=getParent(target,".submitclose");
        if (closing) dropClass(closing,"submitclose");
        var form=getParent(target,"FORM");
        var div=((form)&&(getParent(form,".metabookglossform")));
        var input=((div)&&(getChild(div,"TEXTAREA")));
        if (hasClass(div,"focused")) {
            setTimeout(function(){
                if (input) {metaBook.setFocus(input); input.focus();}},
                       150);
            return;}
        if ((hasParent(target,".addglossmenu"))||
            (hasParent(target,".glossexposure")))
            return;
        if (!(hasParent(target,".textbox"))) fdjtUI.cancel(evt);
        addClass(div,"focused");
        metaBook.setHUD(true);
        glossform_focus(evt);}
    metaBook.UI.glossform_touch=glossform_touch;
    metaBook.UI.glossform_focus=glossform_focus;
    metaBook.UI.glossform_blur=glossform_blur;

    /* Adding a gloss button */
    
    function glossbutton_ontap(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var passage=getTarget(target);
        if ((metaBook.mode==="addgloss")&&
            (metaBook.glosstarget===passage)) {
            fdjtUI.cancel(evt);
            metaBook.setMode(true);}
        else if (passage) {
            fdjtUI.cancel(evt);
            var form=setGlossTarget(passage);
            if (!(form)) return;
            metaBook.setMode("addgloss");
            setGlossForm(form);}}

    function glossdeleted(response,glossid,frag){
        if (response===glossid) {
            metaBook.glossdb.drop(glossid);
            var editform=fdjtID("METABOOKEDITGLOSS_"+glossid);
            if (editform) {
                var editor=editform.parentNode;
                if (editor===fdjtID('METABOOKLIVEGLOSS')) {
                    metaBook.glosstarget=false;
                    metaBook.setMode(false);}
                fdjtDOM.remove(editor);}
            var renderings=fdjtDOM.Array(document.getElementsByName(glossid));
            var i=0; var lim=renderings.length;
            if (renderings) {
                while (i<lim) {
                    var rendering=renderings[i++];
                    if (rendering.id==='METABOOKSKIM')
                        fdjtDOM.replace(
                            rendering,fdjtDOM("div.metabookcard.deletedgloss"));
                    else fdjtDOM.remove(rendering);}}
            var glossmarks=
                document.getElementsByName("METABOOK_GLOSSMARK_"+frag);
            glossmarks=fdjtDOM.Array(glossmarks);
            i=0; lim=glossmarks.length; while (i<lim) {
                var glossmark=glossmarks[i++];
                var newglosses=RefDB.remove(glossmark.glosses,glossid);
                if (newglosses.length===0) fdjtDOM.remove(glossmark);
                else glossmark.glosses=newglosses;}
            var highlights=fdjtDOM.$(
                ".mbexcerpt[data-glossid='"+glossid+"']");
            highlights=fdjtDOM.Array(highlights);
            i=0; lim=highlights.length; while (i<lim) {
                fdjtUI.Highlight.remove(highlights[i++]);}}
        else fdjtUI.alert(response);}

    function delete_gloss(uuid){
        var gloss=metaBook.glossdb.probe(uuid);
        // If this isn't defined, the gloss hasn't been saved so we
        //  don't try to delete it.
        if ((gloss)&&(gloss.created)&&(gloss.maker)) {
            var frag=gloss.get("frag");
            fdjt.Ajax.jsonCall(
                function(response){glossdeleted(response,uuid,frag);},
                "https://"+metaBook.server+"/1/delete",
                "gloss",uuid);}
        else if ((gloss)&&(gloss.frag)) {
            // This is the case where the gloss hasn't been saved
            //  or is an anonymous gloss by a non-logged in user
            glossdeleted(uuid,uuid,gloss.frag);}}
    
    function addoutlet_keydown(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var content=target.value;
        var glossdiv=fdjtID("METABOOKLIVEGLOSS");
        if (!(glossdiv)) return;
        var form=getChild(glossdiv,"FORM");
        var share_cloud=metaBook.share_cloud;
        var ch=evt.keyCode||evt.charCode;
        if ((fdjtString.isEmpty(content))&&(ch===13)) {
            if (share_cloud.selection) 
                metaBook.addOutlet2Form(
                    form,share_cloud.selection.getAttribute("data-value"));
            else metaBook.setGlossMode("editnote");
            return;}
        else if ((ch===13)&&(share_cloud.selection)) {
            metaBook.addOutlet2Form(form,share_cloud.selection);
            share_cloud.complete("");
            target.value="";}
        else if (ch===13) {
            var completions=share_cloud.complete(content);
            if (completions.length)
                metaBook.addOutlet2Form(
                    form,completions[0].getAttribute("data-value"));
            else metaBook.addOutlet2Form(form,content);
            fdjtUI.cancel(evt);
            target.value="";
            share_cloud.complete("");}
        else if (ch===9) { /* tab */
            share_cloud.complete(content);
            fdjtUI.cancel(evt);
            if ((share_cloud.prefix)&&
                (share_cloud.prefix!==content)) {
                target.value=share_cloud.prefix;
                fdjtDOM.cancel(evt);
                setTimeout(function(){
                    metaBook.UI.updateScroller("METABOOKGLOSSOUTLETS");},
                           100);
                return;}
            else if (evt.shiftKey) share_cloud.selectPrevious();
            else share_cloud.selectNext();}
        else setTimeout(function(){
            share_cloud.complete(target.value);},
                        100);}

    function addtag_keydown(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var content=target.value;
        var glossdiv=fdjtID("METABOOKLIVEGLOSS");
        if (!(glossdiv)) return;
        var form=getChild(glossdiv,"FORM");
        var gloss_cloud=metaBook.gloss_cloud;
        var ch=evt.keyCode||evt.charCode;
        if ((fdjtString.isEmpty(content))&&(ch===13)) {
            if (gloss_cloud.selection) 
                metaBook.addTag2Form(form,gloss_cloud.selection);
            else metaBook.setGlossMode(false);
            gloss_cloud.clearSelection();
            return;}
        else if ((ch===13)&&(gloss_cloud.selection)) {
            metaBook.addTag2Form(form,gloss_cloud.selection);
            gloss_cloud.complete("");
            gloss_cloud.clearSelection();
            target.value="";}
        else if (ch===13) {
            gloss_cloud.complete(content);
            if ((content.indexOf('|')>=0)||
                (content.indexOf('@')>=0))
                metaBook.addTag2Form(form,content);
            else metaBook.handleTagInput(content,form,true);
            fdjtUI.cancel(evt);
            target.value="";
            gloss_cloud.complete("");}
        else if (ch===9) { /* tab */
            gloss_cloud.complete(content);
            fdjtUI.cancel(evt);
            if ((gloss_cloud.prefix)&&
                (gloss_cloud.prefix!==content)) {
                target.value=gloss_cloud.prefix;
                fdjtDOM.cancel(evt);
                setTimeout(function(){
                    metaBook.UI.updateScroller("METABOOKGLOSSCLOUD");},
                           100);
                return;}
            else if (evt.shiftKey) gloss_cloud.selectPrevious();
            else gloss_cloud.selectNext();}
        else setTimeout(function(){
            gloss_cloud.complete(target.value);},
                        100);}

    var attach_types=/\b(uploading|linking|glossbody|capture)\b/g;
    function changeAttachment(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        var form=getParent(target,'form');
        var newtype=target.value;
        if (target.checked)
            fdjtDOM.swapClass(form,attach_types,newtype);
        else dropClass(form,target.value);}
    metaBook.UI.changeAttachment=changeAttachment;

    function setAttachType(newtype){
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        var form=fdjtDOM.getChild(livegloss,"FORM");
        fdjtDOM.swapClass(form,attach_types,newtype);
        var attachform=fdjtID("METABOOKATTACHFORM");
        var input=fdjtDOM.getInputFor(attachform,"ATTACHTYPE",newtype);
        fdjt.UI.CheckSpan.set(input,true);}
    metaBook.setAttachType=setAttachType;

    function attach_submit(evt){
        evt=evt||window.event;
        var form=fdjtUI.T(evt);
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        var linkinput=fdjtDOM.getInput(form,"URL");
        var titleinput=fdjtDOM.getInput(form,"TITLE");
        var title=(titleinput.value)&&(fdjtString.stdspace(titleinput.value));
        var isokay=fdjtDOM.getInput(form,"FILEOKAY");
        var path=linkinput.value;
        fdjtUI.cancel(evt);
        if (!(livegloss)) return;
        if ((!(title))&&(path)) {
            var namestart=((path.indexOf('/')>=0)?
                           (path.search(/\/[^\/]+$/)):(0));
            if (namestart<0) title=path;
            else title=path.slice(namestart);}
        if (hasClass(form,"linkurl")) {
            if (!(goodURL(linkinput.value))) {
                fdjtUI.alert("This URL doesn't look right");
                return;}
            metaBook.addLink2Form(form,linkinput.value,title);
            metaBook.setGlossMode("editnote");}
        else if (hasClass(form,"uploadfile")) {
            if (!(metaBook.glossattach)) {
                fdjtUI.alert("You need to specify a file!");
                return;}
            else if (!(isokay.checked))
                fdjt.UI.choose([{label: "Yes",
                                 handler: function(){
                                     fdjtUI.CheckSpan.set(isokay,true);
                                     doFileAttach(title,livegloss);}},
                                {label: "Cancel"}],
                               fdjtDOM("P","By choosing 'Yes,' I affirm that ",
                                       "I have the right to use and share this ",
                                       "file according to the sBooks ",
                                       fdjtDOM.Anchor(
                                           "https://www.sbooks.net/legalia/TOS/",
                                           "A[target='_blank']",
                                           "Terms of Service"),
                                       "."));
            else {
                attachFile(metaBook.glossattach,
                           title||metaBook.glossattach.name,
                           livegloss).
                    then(function(){
                        metaBook.setGlossMode("editnote");
                        clearAttachForm();}).
                    catch(function(trouble){
                        fdjtLog("Trouble attaching file %o (%o)",
                                metaBook.glossattach,trouble);});}}
        else {}
        return;}
    function attach_cancel(evt){
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        if (!(livegloss)) return;
        linkinput.value="";
        titleinput.value="";
        metaBook.setGlossMode("editnote");
        fdjtUI.cancel(evt);}
    function attach_keydown(evt){
        evt=evt||window.event;
        var ch=evt.keyCode||evt.charCode;
        if (ch!==13) return;
        fdjtUI.cancel(evt);
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var livegloss=fdjtID("METABOOKLIVEGLOSS");
        if (!(livegloss)) return;
        var form=getChild(livegloss,"FORM");
        metaBook.addLink2Form(form,linkinput.value,titleinput.value);
        linkinput.value="";
        titleinput.value="";
        metaBook.setGlossMode("editnote");}

    function doFileAttach(title,livegloss){
        attachFile(metaBook.glossattach,
                   title||metaBook.glossattach.name,
                   livegloss).
            then(function(){
                metaBook.setGlossMode("editnote");
                clearAttachForm();}).
            catch(function(trouble){
                fdjtLog("Trouble attaching file %o (%o)",
                        metaBook.glossattach,trouble);});}

    function attach_file_click(evt){
        var file_input=fdjtID("METABOOKFILEINPUT");
        var ev=document.createEvent("MouseEvents");
        ev.initMouseEvent('click', true, true, evt.view);
        file_input.dispatchEvent(ev);
        fdjtUI.cancel(evt);}

    function clearAttachForm(){
        var linkinput=fdjtID("METABOOKATTACHURL");
        var titleinput=fdjtID("METABOOKATTACHTITLE");
        var rightsok=fdjt.ID("METABOOKUPLOADRIGHTS");
        linkinput.value=""; titleinput.value="";
        fdjt.ID("METABOOKATTACHFILE").className="nofile";
        fdjt.ID("METABOOKATTACHFILENAME").innerHTML="";
        fdjt.UI.CheckSpan.set(rightsok,false);}

    function attachFile(file,title,livegloss){
        var glossid=fdjtDOM.getInputValue(livegloss,"UUID");
        var itemid=fdjtState.getUUID();
        var filename=file.name, filetype=file.type;
        // var reader=new FileReader();
        var savereq=new XMLHttpRequest();
        var endpoint="https://glossdata.sbooks.net/"+
            glossid+"/"+itemid+"/"+filename;
        var glossdata_uri="https://glossdata.sbooks.net/"+
            glossid+"/"+itemid+"/"+filename;
        var aborted=false, done=false;
        function attaching_file(resolve,reject){        
            savereq.onreadystatechange=function(){
                if (aborted) {}
                else if (done) {}
                else if (savereq.readyState===4) {
                    if (savereq.status===200) {
                        addLink(livegloss,glossdata_uri,
                                title||filename||"attachment");
                        metaBook.glossattach=false;
                        done=true; resolve(savereq);}
                    else {done=aborted=true; reject(savereq);}}
                else {}};
            savereq.ontimeout=function(evt){reject(evt);};
            savereq.open("POST",endpoint);
            savereq.setRequestHeader("content-type",filetype);
            savereq.withCredentials=true; // savereq.timeout=10000;
            savereq.send(file);}
        return new Promise(attaching_file);}

    function glossetc_touch(evt){
        var target=fdjtUI.T(evt);
        fdjtUI.CheckSpan.onclick(evt);
        var form=getParent(target,"form");
        var input=getInput(form,"NOTE");
        input.focus();}

    function addGlossDragOK(evt){
        evt=evt||window.event;
        var types=evt.dataTransfer.types;
        if (!(types)) return;
        else if (types.indexOf("Files")>=0)
            fdjt.UI.cancel(evt);
        else if (types.indexOf("text/uri-list")>=0)
            fdjt.UI.cancel(evt);
        else if (types.indexOf("text/plain")>=0) {
            var text=evt.dataTransfer.getData("text/plain");
            if (text.search(/^\s*https?:\/\//)===0)
                fdjt.UI.cancel(evt);}
        else {}}
    function addGlossDrop(evt){
        evt=evt||window.event;
        var attachform=fdjt.ID("METABOOKATTACHFORM");
        var types=evt.dataTransfer.types;
        if (!(types)) return;
        else if (types.indexOf("text/uri-list")>=0) {
            var url=evt.dataTransfer.getData("URL");
            if (!(url)) return;
            fdjt.UI.cancel(evt);
            metaBook.setGlossMode("attach");
            setAttachType("linkurl");
            fdjt.ID("METABOOKATTACHURL").value=url;
            fdjt.ID("METABOOKATTACHTITLE").focus();}
        else if (types.indexOf("text/plain")>=0) {
            var text=evt.dataTransfer.getData("text/plain");
            fdjt.UI.cancel(evt);
            if (text.search(/^\s*https?:\/\//)===0) {
                metaBook.setGlossMode("attach");
                if (hasClass(attachform,"linkurl")) {}
                else if (hasClass(attachform,"copyurl")) {}
                else setAttachType("linkurl");
                fdjt.ID("METABOOKATTACHURL").value=text;
                fdjt.ID("METABOOKATTACHTITLE").focus();}
            else {
                var livegloss=fdjt.ID("METABOOKLIVEGLOSS");
                var input=fdjtDOM.getInput(livegloss,"NOTE");
                metaBook.setGlossMode(false);
                input.value=text;
                input.focus();}}
        else if (types.indexOf("Files")>=0) {
            var files=evt.dataTransfer.files;
            var file=files[0];
            fdjtUI.cancel(evt);
            metaBook.glossattach=file;
            setAttachType("uploadfile");
            fdjtID("METABOOKATTACHFILENAME").innerHTML=file.name;
            fdjtDOM.swapClass(
                fdjtID("METABOOKATTACHFILE"),"nofile","havefile");}
        else {}}

    function glossUploadChanged(evt){
        var target=fdjtUI.T(evt), file=target.files[0];
        if (file) {
            metaBook.glossattach=file;
            fdjtID("METABOOKATTACHFILENAME").innerHTML=file.name;
            fdjtDOM.swapClass(
                fdjtID("METABOOKATTACHFILE"),"nofile","havefile");}}

    function editglossnote(evt){
        evt=evt||window.event;
        metaBook.setGlossMode("editnote");
        fdjtUI.cancel(evt);}

    function startGloss(passage){
        var selecting=metaBook.UI.selectText(passage);
        if ((metaBook.TapHold.page)&&(metaBook.TapHold.page.abort))
            metaBook.TapHold.page.abort();
        if ((metaBook.TapHold.content)&&(metaBook.TapHold.page.content))
            metaBook.TapHold.content.abort();
        metaBook.select_target=passage;
        selectors.push(selecting);
        selectors[passage.id]=selecting;
        fdjtUI.TapHold.clear();
        startAddGloss(passage,false,false);}
    metaBook.startGloss=startGloss;

    function startAddGloss(passage,mode,evt){
        if (metaBook.glosstarget===passage) {
            if ((Trace.gestures)||(Trace.glossing))
                fdjtLog("startAddGloss/resume %o %o form=%o",
                        evt,passage,metaBook.glossform);
            if (mode) metaBook.setGlossMode(mode,metaBook.glossform);
            metaBook.setMode("addgloss",true);
            if (evt) fdjtUI.cancel(evt);
            return;}
        var selecting=selectors[passage.id]; abortSelect(selecting);
        var form_div=setGlossTarget(
            passage,((metaBook.mode==="addgloss")&&
                     (metaBook.glossform)),selecting);
        var form=getChild(form_div,"form");
        if (!(form)) return;
        else if (evt) fdjtUI.cancel(evt);
        if ((Trace.gestures)||(Trace.glossing))
            fdjtLog("startAddGloss (%o) %o f=%o/%o",
                    evt,passage,form_div,form);
        setGlossForm(form_div);
        if (mode) form.className=mode;
        metaBook.setMode("addgloss",false);}
    metaBook.startAddGloss=startAddGloss;
    
    function saveGlossDialog(){
        // This prompts for updating the layout
        var msg=fdjtDOM("div.message","Save gloss?");
        saving_dialog=true;
        // When a choice is made, it becomes the default
        // When a choice is made to not resize, the
        // choice timeout is reduced.
        var choices=[
            {label: "Save",
             handler: function(){
                 metaBook.submitGloss();
                 saving_dialog=false;},
             isdefault: true},
            {label: "Discard",
             handler: function(){
                 metaBook.cancelGloss();
                 saving_dialog=false;}}];
        var spec={choices: choices,
                  timeout: (metaBook.save_gloss_timeout||
                            metaBook.choice_timeout||7),
                  spec: "div.fdjtdialog.fdjtconfirm.savegloss"};
        saving_dialog=fdjtUI.choose(spec,msg);
        return saving_dialog;}
    metaBook.saveGlossDialog=saveGlossDialog;

    function startSelect(passage,evt){
        var selecting=metaBook.UI.selectText(passage);
        if ((metaBook.TapHold.page)&&(metaBook.TapHold.page.abort))
            metaBook.TapHold.page.abort();
        if ((metaBook.TapHold.content)&&(metaBook.TapHold.page.content))
            metaBook.TapHold.content.abort();
        metaBook.select_target=passage;
        selectors.push(selecting);
        selectors[passage.id]=selecting;
        fdjtUI.TapHold.clear();
        // This makes a selection start on the region we just created.
        if ((Trace.gestures)||(Trace.selecting)) 
            fdjtLog("body_held/select_wait %o %o %o",
                    selecting,passage,evt);
        setTimeout(function(){
            if ((Trace.gestures)||(Trace.selecting)) 
                fdjtLog("body_held/select_start %o %o %o",
                        selecting,passage,evt);
            selecting.startEvent(evt,250);},
                   0);}
    metaBook.startSelect=startSelect;

    function abortSelect(except){
        var i=0, lim=selectors.length;
        while (i<lim) {
            var sel=selectors[i++];
            if (sel!==except) sel.clear();}
        selectors=[];
        metaBook.select_target=false;}
    metaBook.abortSelect=abortSelect;

    metaBook.getTextSelectors=function getTextSelectors(){return selectors;};

    function closeGlossForm(glossform,evt){
        if (!(glossform)) glossform=metaBook.glossform;
        if (!(glossform)) return;
        if (saving_dialog) return;
        if (!(hasClass(glossform,"modified")))
            metaBook.cancelGloss();
        else if (hasClass(glossform,"glossadd")) 
            saveGlossDialog();
        else metaBook.submitGloss(glossform);
        if (evt) fdjtUI.cancel(evt);
        return;}
    metaBook.closeGlossForm=closeGlossForm;

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {".metabookglossform":
         {click: glossform_touch,touchstart: glossform_touch},
         glossbutton: {mouseup: glossbutton_ontap,mousedown: cancel},
         "span.metabooksharegloss": {
             tap: fdjt.UI.CheckSpan.onclick},
         ".metabookglossform .response": {click: metaBook.toggleHUD},
         ".addglossmenu": {
             tap: glossmode_tap,
             hold: glossmode_hold,
             slip: glossmode_slip,
             release: glossmode_release,
             click: cancel},
         "div.glossetc": {},
         "div.glossetc div.sharing": {click: glossform_outlets_tapped},
         "div.glossetc div.notetext": {click: editglossnote},
         "#METABOOKADDGLOSS": {
             dragenter: addGlossDragOK,
             dragover: addGlossDragOK,
             drop: addGlossDrop},
         "#METABOOKATTACHFILE": {
             click: attach_file_click},
         "#METABOOKGLOSSATTACH": {
             dragenter: addGlossDragOK,
             dragover: addGlossDragOK,
             drop: addGlossDrop},
         "#METABOOKADDTAGINPUT": {keydown: addtag_keydown},
         "#METABOOKADDSHAREINPUT": {keydown: addoutlet_keydown},
         "#METABOOKATTACHFORM": {submit: attach_submit},
         "#METABOOKATTACHURL": {keydown: attach_keydown},
         "#METABOOKATTACHTITLE": {keydown: attach_keydown},
         "#METABOOKATTACHCANCEL": {click: attach_cancel},
         "#METABOOKFILEINPUT": {change: glossUploadChanged},
         "#METABOOKGLOSSCLOUD": {
             tap: metaBook.UI.handlers.glosscloud_select,
             release: metaBook.UI.handlers.glosscloud_select},
         "#METABOOKSHARECLOUD": {
             tap: outlet_select,release: outlet_select}});

    fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {".metabookglossform .response": {click: metaBook.toggleHUD},
         ".addglossmenu": {
             tap: glossmode_tap,
             hold: glossmode_hold,
             slip: glossmode_slip,
             release: glossmode_release,
             click: cancel},
         "div.glossetc": {
             touchstart: glossetc_touch,
             touchend: cancel},
         "div.glossetc div.sharing": {
             touchend: glossform_outlets_tapped,
             click: cancel},
         "div.glossetc div.notetext": {
             touchend: editglossnote,
             click: cancel},
         "#METABOOKADDTAGINPUT": {keydown: addtag_keydown},
         "#METABOOKADDSHAREINPUT": {keydown: addoutlet_keydown},
         "#METABOOKATTACHFORM": {submit: attach_submit},
         "#METABOOKATTACHURL": {keydown: attach_keydown},
         "#METABOOKATTACHTITLE": {keydown: attach_keydown},
         "#METABOOKATTACHFILE": {click: attach_file_click},
         "#METABOOKATTACHCANCEL": {click: attach_cancel},
         "#METABOOKADDGLOSS": {
             dragenter: addGlossDragOK,
             dragover: addGlossDragOK,
             drop: addGlossDrop},
         "#METABOOKFILEINPUT": {change: glossUploadChanged},
         "#METABOOKGLOSSCLOUD": {
             tap: metaBook.UI.handlers.glosscloud_select,
             release: metaBook.UI.handlers.glosscloud_select},
         "#METABOOKSHARECLOUD": {
             tap: outlet_select,release: outlet_select}});

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
