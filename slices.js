/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/slices.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file implements the display of lists of glosses or summaries
   referring to book passages.

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
/* global metaBook: false */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));

metaBook.Slice=(function () {
    "use strict";
    
    var fdjtString=fdjt.String;
    var fdjtTime=fdjt.Time;
    var fdjtDOM=fdjt.DOM;
    var fdjtLog=fdjt.Log;
    var fdjtUI=fdjt.UI;
    var showPage=fdjt.showPage;
    var RefDB=fdjt.RefDB, Ref=RefDB.Ref;
    var $=fdjtDOM.$, $ID=fdjt.ID;

    var mB=metaBook, mbID=mB.ID, Trace=mB.Trace;

    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;

    var mbicon=metaBook.icon;
    var addListener=fdjtDOM.addListener;

    var getParent=fdjtDOM.getParent;
    var hasParent=fdjtDOM.hasParent;
    var getChild=fdjtDOM.getChild;

    var getInitials=fdjtString.getInitials;

    var cancel=fdjtUI.cancel;
    
    var TOA=fdjtDOM.toArray;

    function getTargetDup(scan,target){
        var targetid=target.id;
        while (scan) {
            if (hasClass(scan,"codexpage")) return scan;
            else if ((scan.getAttribute)&&
                     ((scan.id===targetid)||
                      (scan.getAttribute("data-baseid")===targetid))) 
                return scan;
            else scan=scan.parentNode;}
        return target;}

    function generic_cancel(evt){
        evt=evt||window.event;
        var target=fdjtUI.T(evt);
        if (fdjtUI.isClickable(target)) return;
        else cancel(evt);}

    function renderCard(info,query,idprefix,standalone){
        var target_id=(info.frag)||(info.id);
        // var target=((target_id)&&(mbID(target_id)));
        var target_info=metaBook.docinfo[target_id];
        if (!(target_info)) return false;
        var head_info=((target_info.level)?(target_info):(target_info.head));
        var head=((head_info)&&(mbID(head_info.frag)));
        var score=((query)&&(query.scores.get(info)));
        var excerpt_len=((info.excerpt)?(info.excerpt.length):(0));
        var note=(info.note)&&(info.note.trim());
        var note_len=(note)&&note.length;
        var overlay=getoverlay(info);
        var shared=(info.shared)||[];
        var sample=(query)&&(!(standalone))&&(!(info.maker))&&
            sampletext(mbID(target_id));
        if (typeof shared === 'string') shared=[shared];
        if (overlay) shared=RefDB.remove(shared,(overlay._qid||overlay._id));
        var body=
            fdjtDOM("div.metabookcardbody",
                    ((score)&&(showscore(info,score,query))),
                    (((info.maker)||(info.tstamp))?(showglossinfo(info)):
                     (showdocinfo(info))),
                    (sample),
                    ((note_len>0)&&(info.maker)&&(showmaker(info))),
                    ((note_len>0)&&(shownote(info)))," ",
                    ((info.detail)&&(fdjtDOM("span.glossbody","More")))," ",
                    (((info.alltags)||(info.tags))&&(showtags(info,query)))," ",
                    ((info.links)&&(showlinks(info.links)))," ",
                    ((info.attachments)&&
                     (showlinks(info.attachments,"span.attachments")))," ",
                    ((shared)&&(shared.length)&&(showaudience(shared))),
                    ((excerpt_len>0)&&(showexcerpts(info.excerpt)))," ");
        var card=
            fdjtDOM(((info.maker) ?
                     "div.metabookcard.gloss" :
                     "div.metabookcard.passage"),
                    ((head)&&(makeTOCHead(head,((info.level)&&(info))))),
                    ((standalone)&&(makelocbar(target_info))),
                    body,
                    fdjtDOM("div.fdjtclearfloats"));
        if (info.maker) {
            info.maker.load().then(function(makerinfo){
                var tstamp=info.tstamp||info.modified||info.created;
                if (!(makerinfo._live)) return;
                if (makerinfo.kind!==':PERSON') return;
                if (tstamp)
                    body.title="gloss from "+((makerinfo.name)||"someone")+
                    " at "+fdjtTime.shortString(tstamp);
                else body.title="gloss from "+((makerinfo.name)||"someone");
                addClass(card,"personal");});}
        card.about="#"+info.frag;
        card.setAttribute('data-passage',target_id);
        card.setAttribute('data-location',target_info.starts_at);
        if (head_info) card.setAttribute('data-tochead',head_info.frag);
        if ((info.maker)||(info.tstamp)) {
            card.setAttribute('data-gloss',info._id);
            if (info.tstamp)
                card.setAttribute('data-timestamp',info.tstamp);}
        if (score) card.setAttribute("data-searchscore",score);
        if (idprefix) card.id=idprefix+info.id;
        if (info._id) {
            card.name=card.qref=info._id;
            card.setAttribute("name",info._id);}
        return card;}
    metaBook.renderCard=renderCard;
    
    function sampletext(para,len){
        if (!(len)) len=80;
        if (!(para)) return false;
        var fulltext=fdjtDOM.textify(para);
        var sample=(para.title)||para.getAttribute("data-summary")||
            ((fulltext.length<len)?(fulltext):(fulltext.slice(0,len)));
        var span=fdjtDOM("span.sample",sample);
        span.title=fulltext;
        return span;}

    function convertNote(note){
        if (note.search(/^{(md|markdown)}/)===0) {
            var close=note.indexOf('}');
            return metaBook.md2DOM(note.slice(close+1),true);}
        else return note;}
    function shownote(gloss){
        return fdjtDOM("span.note",convertNote(gloss.note));}

    function showmaker(gloss){
        var maker=gloss.maker;
        if (maker._live)
            return fdjtDOM("span.maker",maker.name||"From");
        else {
            var temp=fdjtDOM("span.maker","From");
            maker.load().then(function(m){
                if (m.name) temp.innerHTML=m.name;});
            return temp;}}

    var isArray=Array.isArray;

    function showtags(info,query){
        var tagicon=fdjtDOM.Image(mbicon("tagicon",64,64),
                                  "img.tagicon","tags");
        var matches=((query)&&(fdjtDOM("span.matches")));
        var toptags=fdjtDOM("span.top");
        var sectags=fdjtDOM("span.sectags");
        var othertags=fdjtDOM("span.other");
        var count=0, seen={};
        var tagslots=["**tags","*tags","+tags","+tags*","knodes","tags",
                      "**tags*","*tags*","tags*","^tags","^tags*"];
        var j=0, nslots=tagslots.length, ntags=0;
        while (j<nslots) {
            var slot=tagslots[j++], tags=info[slot];
            if (!(tags)) continue;
            else if (!(isArray(tags))) tags=[tags];
            else if (tags.length===0) continue;
            else {}
            var i=0, lim=tags.length; ntags=ntags+lim;
            while (i<lim) {
                var tag=tags[i++];
                if (!(tag)) continue;
                var tagstring=((typeof tag === "string")?(tag):
                               ((tag._qid)||(tag.getQID())));
                if (seen[tagstring]) continue;
                else {count++; seen[tagstring]=tag;}
                var sectag=((tag._qid)&&(tag._qid[0]==="\u00a7"));
                var elt=((sectag)?(sectag2HTML(tag)):
                         (Knodule.HTML(tag,metaBook.knodule)));
                if ((matches)&&(tag_matchp(tag,query)))
                    fdjtDOM(matches," ",elt);
                else if (sectag) fdjtDOM(sectags," ",elt);
                else if (count<4) fdjtDOM(toptags," ",elt);
                else fdjtDOM(othertags," ",elt);}}
        if (ntags)
            return fdjtDOM("span.tags",tagicon,
                           matches,toptags,othertags,sectags);
        else return false;}

    function tag_matchp(tag,query){
        var qtags=query.tags;
        var i=0, lim=qtags.length;
        while (i<lim) {
            var qtag=qtags[i++];
            if (qtag===tag) return true;
            else if ((tag.allways)&&(tag.allways.indexOf(qtag)>=0))
                return true;
            else {}}
        return false;}

    function sectag2HTML(sectag){
        var name=sectag._id;
        var span=fdjtDOM("span.sectname",name);
        span.setAttribute("data-value",sectag._qid);
        if (name.length>20) addClass(span,"longterm");
        return span;}

    function showaudience(outlets,spec){
        if (!(outlets instanceof Array)) outlets=[outlets];
        if (outlets.length===0) return false;
        var span=fdjtDOM(
            spec||((outlets.length>1)?("div.audience"):("span.audience")),
            ((outlets.length>1)&&
             (fdjtDOM("span.count",outlets.length, " outlets"))),
            " ");
        var i=0; var lim=outlets.length; while (i<lim) {
            var outlet=outlets[i]; var info=metaBook.sourcedb.ref(outlet);
            var outlet_span=fdjtDOM("span.outlet");
            if (info._live) {
                fdjtDOM(outlet_span,info.name);
                if (info.about) 
                    outlet_span.title="Shared with “"+info.name+
                    "” — "+info.about;
                else outlet_span.title="Shared with “"+info.name+"”";}
            else {
                outlet_span.setAttribute("NAME","OUTLETSPAN"+info._id);
                info.load().then(fill_outlet_spans);}
            fdjtDOM.append(span," ",outlet_span);
            i++;}
        return span;}
    function fill_outlet_spans(info){
        var outlet_spans=
            TOA(document.getElementsByName("OUTLETSPAN"+info._id));
        var i=0, len=outlet_spans.length; while (i<len) {
            var outlet_span=outlet_spans[i++];
            outlet_span.removeAttribute("NAME");
            fdjtDOM(outlet_span,info.name);
            if (info.about) 
                outlet_span.title="Shared with “"+info.name+"” — "+info.about;
            else outlet_span.title="Shared with “"+info.name+"”";}}

    function showlinks(refs,spec){
        var count=0;
        for (var url in refs) if (url[0]==='_') continue; else count++;
        if (count===0) return false;
        var span=fdjtDOM(spec||((count>4)?("div.links"):("span.links")),
                         ((count>1)&&(fdjtDOM("span.count",count, " links"))),
                         " ");
        for (url in refs) {
            if (url[0]==='_') continue;
            var urlinfo=refs[url], elt=false;
            var openinbook=(url.search("https://glossdata.sbooks.net/")===0)||
                (url.search("resources/")===0);
            var title; var icon=false, type=false, useclass=false;
            if (!(openinbook)) {
                var inbookurls=metaBook.inbookurls;
                var i=0, lim=inbookurls; while (i<lim) {
                    var pat=inbookurls[i++];
                    if (typeof pat === 'string') {
                        if (url.search(pat)===0) {openinbook=true; break;}}
                    else if (pat.exec(url)) {
                        openinbook=true; break;}
                    else {}}}
            if (typeof urlinfo === 'string') title=urlinfo;
            else {
                title=urlinfo.title;
                icon=urlinfo.icon;
                type=urlinfo.type;}
            if (!(type)) type=metaBook.urlType(url);
            if (!(icon)) icon=metaBook.typeIcon(type);
            if (!(useclass)) useclass=metaBook.mediaTypeClass(type);
            var image=fdjtDOM.Image(icon);
            if (openinbook) {
                elt=fdjtDOM("span.mbmedia",image,title);
                elt.setAttribute("data-src",url);
                if (type) elt.setAttribute("data-type",type);
                elt.title="Reveal "+title;}
            else elt=fdjtDOM.Anchor(
                url,{title:"Link to "+url,target:"_blank"},image,title);
            if (useclass) addClass(elt,useclass);
            fdjtDOM(span,elt,"\n");}
        return span;}
    function showexcerpts(excerpts){
        if (typeof excerpts==='string')
            return fdjtUI.Ellipsis("span.excerpt",excerpts,40);
        else if (excerpts.length===1)
            return fdjtUI.Ellipsis("span.excerpt",excerpts[0],40);
        else {
            var ediv=fdjtDOM("div.excerpts");
            var i=0; var lim=excerpts.length;
            while (i<lim)
                fdjtDOM(ediv,
                        ((i>0)&&" "),
                        fdjtUI.Ellipsis("span.excerpt",excerpts[i++],40));
            return ediv;}}
    function showscore(elt,score,query){
        var staricon=fdjtDOM.Image(mbicon("goldstar",24,24),"img.inline");
        var tagicon=fdjtDOM.Image(mbicon("tagicon",24,24),"img.inline");
        var count=((query)&&(query.counts)&&(query.counts.get(elt)));
        var partial=((count)&&(query.tags.length>1)&&
                     ((count!==query.tags.length)?                     
                      (fdjtDOM("span.note",count,tagicon)):
                      (fdjtDOM("span.note","all",tagicon))));
        if (count) count=count+":";
        if ((query)&&(query.max_score))
            return fdjtDOM(
                "span.score",partial,"(",score,"/",query.max_score,staricon,")");
        else return fdjtDOM("span.score",partial,"(",score,staricon,")");}
    function showglossinfo(info) {
        var maker=info.maker, makerid=(info.maker._id)||(info.maker);
        var can_edit=((maker===metaBook.user)||(maker===metaBook.user._id))||
            ((mB.outlets)&&(mB.outlets.indexOf(maker)>=0))||
            ((mB.outlets)&&(mB.outlets.indexOf(makerid)>=0));
        var agestring=timestring(info.modified||info.created||info.tstamp);
        var age=fdjtDOM("span.age",agestring);
        age.title=fdjtTime.timeString(info.modified||info.created||info.tstamp);
        var tool=fdjtDOM(
            "span.tool",age," ",
            fdjtDOM("span.label",((can_edit)?"modify":"respond")),
            ((can_edit)?
             (fdjtDOM.Image(mbicon("gloss_edit_titled",64,64),"img.button",
                            "edit","tap to edit this gloss, hold to reply")):
             (fdjtDOM.Image(mbicon("gloss_respond_titled",64,64),"img.button",
                            "reply","relay/reply to this gloss"))),
            ((info.private)&&(fdjtDOM("span.private","Private"))));
        addListener(tool,"tap",glossaction);
        addListener(tool,"release",glossaction);
        
        var pic=getglosspic(info);
        if (pic) fdjtDOM.addListener(pic,"touchstart",fdjt.UI.noDefault);

        return [pic,tool];}
    function showdocinfo(info) {
        if (info) return false; else return false;}

    function getoverlay(info){
        if (info.sources) {
            var sources=info.sources;
            if (typeof sources === 'string') sources=[sources];
            var i=0; var lim=sources.length;
            while (i<lim) {
                var source=metaBook.sourcedb.loadref(sources[i++]);
                if ((source)&&(source.kind===':OVERLAY'))
                    return source;}
            return false;}
        else return false;}

    var IMG=fdjtDOM.Image;

    function getglosspic(gloss){
        if (gloss._pic||gloss.pic) 
            return IMG(gloss._pic||gloss.pic,"img.glosspic.glossicon",
                       gloss.note||gloss.name);
        if ((gloss.links)&&(gloss.links.icon))
            return IMG(gloss.links.icon,"img.glosspic.glossicon");
        var maker=((gloss.maker)&&
                   ((typeof gloss.maker === "string")?
                    (gloss.maker=mB.sourcedb.ref(gloss.maker)):
                    (gloss.maker)));
        if ((maker)&&(maker._live)&&((maker._pic)||maker.pic)) 
            return IMG(maker._pic||maker.pic,"img.glosspic.userpic",
                       maker.name);
        else if ((maker)&&(maker._live)&&(maker.fbid))
            return IMG("https://graph.facebook.com/"+
                       gloss.maker.fbid+"/picture?type=square",
                       "img.glosspic.userpic.fbpic",
                       gloss.maker.name);
        else if ((maker)&&(maker._live))
            return fdjtDOM("div.glosspic.userpic.sbooknopic",
                           ((gloss.maker.name)?
                            (getInitials(gloss.maker.name,1)):
                            "?"));
        else if (maker) {
            var temp=
                fdjtDOM("div.glosspic.userpic.sbooknopic",
                        ((gloss.maker.name)?
                         (fdjtString.getInitials(gloss.maker.name,1)):
                         "?"));
            maker.load().then(function(maker){
                var usepic=false;
                if (!(maker._live)) usepic=false;
                else if ((maker._pic)||(maker.pic))
                    usepic=IMG(maker._pic||maker.pic,"img.glosspic.userpic",
                               getInitials(gloss.maker.name,1),
                               ((maker.about)?((maker.name)+": "+maker.about):
                                (maker.name)));
                else if (maker.fbid) 
                    usepic=IMG("https://graph.facebook.com/"+
                               maker.fbid+"/picture?type=square",
                               "img.glosspic.userpic.fbpic",
                               getInitials(gloss.maker.name,1),
                               ((maker.about)?((maker.name)+": "+maker.about):
                                (maker.name)));
                else {}
                if (usepic) fdjtDOM.replace(temp,usepic);});
            return temp;}
        else return false;}

    var months=["Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"];
    function timestring(tick){
        var now=fdjtTime.tick(), date=new Date(1000*tick);
        if ((now-tick)<(12*3600)) {
            var hour=date.getHours();
            var minute=date.getMinutes();
            return ""+hour+":"+((minute<10)?"0":"")+minute;}
        else {
            var year=date.getFullYear();
            var month=date.getMonth();
            var datenum=date.getDate();
            if (year<10)
                return ""+datenum+"/"+months[month]+"/0"+year;
            else return ""+datenum+"/"+months[month]+"/"+year;}}

    function makelocbar(target_info,cxt_info){
        var locrule=fdjtDOM("HR");
        var locbar=fdjtDOM("DIV.locbar",locrule);
        var target_start=target_info.starts_at;
        var target_end=target_info.ends_at;
        var target_len=target_end-target_start;
        if (!(cxt_info)) cxt_info=metaBook.docinfo[document.body.id];
        var cxt_start=cxt_info.starts_at;
        var cxt_end=cxt_info.ends_at;
        var cxt_len=cxt_end-cxt_start;
        locrule.style.width=((target_len/cxt_len)*100)+"%";
        locrule.style.left=(((target_start-cxt_start)/cxt_len)*100)+"%";
        var id=target_info.id||target_info.frag;
        if (id) {
            locbar.about="#"+id;
            locbar.title=sumText(mbID(id));}
        return locbar;}

    function makelocrule(target_info,cxtinfo,spec){
        var tocrule=(!(cxtinfo));
        if (!(cxtinfo)) cxtinfo=metaBook.docinfo[metaBook.content.id];
        var locrule=fdjtDOM(spec||"hr.locrule");
        var cxt_start=cxtinfo.starts_at;
        var cxt_end=cxtinfo.ends_at;
        var cxt_len=cxt_end-cxt_start;
        var target_start=target_info.starts_at-cxt_start;
        var target_len=target_info.ends_at-target_info.starts_at;
        var locstring="~"+Math.ceil(target_len/5)+ " words long ~"+
            Math.ceil((target_start/cxt_len)*100)+"% along";
        locrule.setAttribute("about","#"+(target_info.id||target_info.frag));
        locrule.locstring=locstring+".";
        locrule.title=
            ((tocrule)?("this section in the book"):
             ("this passage in the section, "))+
            locstring+": click or hold to glimpse";
        locrule.style.width=((target_len/cxt_len)*100)+"%";
        locrule.style.left=((target_start/cxt_len)*100)+"%";
        return locrule;}
    function makelocstring(target_info,cxtinfo){
        var tocrule=(!(cxtinfo));
        if (!(cxtinfo)) cxtinfo=metaBook.docinfo[metaBook.content.id];
        var cxt_start=cxtinfo.starts_at;
        var cxt_end=cxtinfo.ends_at;
        var cxt_len=cxt_end-cxt_start;
        var target_start=target_info.starts_at-cxt_start;
        var target_len=target_info.ends_at-target_info.starts_at;
        if (tocrule)
            return "this section is ~"+Math.ceil(target_len/7)+
            " words long and ~"+Math.ceil((target_start/cxt_len)*100)+
            "% into the book";
        else return "this passage is ~"+Math.ceil(target_len/7)+
            " words long and ~"+Math.ceil((target_start/cxt_len)*100)+
            "% into the section";}

    function glossaction(evt){
        var target=fdjtUI.T(evt), scan=target;
        fdjtUI.cancel(evt);
        while (scan) {
            if (scan.qref) break;
            else scan=scan.parentNode;}
        if (!(scan)) return;
        var qref=scan.qref;
        var gloss=metaBook.glossdb.ref(qref);
        var form=metaBook.setGlossTarget(gloss,evt.type==="hold");
        if (!(form)) return;
        metaBook.setMode("addgloss");}

    // Displayings sets of notes organized into threads

    function sumText(target){
        var title=metaBook.getTitle(target,true);
        if (title.length<40) return title;
        /* title.slice(0,40)+"\u22ef "; */
        else return title;}
    
    function makeTOCHead(target,head){
        if (!(head)) head=metaBook.getHead(target);
        var basespan=fdjtDOM("span");
        basespan.title='this location in the structure of the book';
        var info=metaBook.docinfo[target.id];
        if (head) {
            var text=sumText(head);
            var headtext=
                fdjtDOM("span.headtext.tocref",
                        fdjtDOM("span.spacer","\u00A7"),
                        text);
            headtext.setAttribute("data-tocref",head.id);
            var curspan=fdjtDOM("span.head",headtext);
            headtext.title='jump to the section: '+text;
            fdjtDOM.append(basespan," ",curspan);
            var heads=metaBook.Info(head).heads;
            if (heads) {
                var j=heads.length-1; while (j>0) {
                    var hinfo=heads[j--]; var elt=mbID(hinfo.frag);
                    if ((!(elt))||(!(hinfo.title))||
                        (elt===metaBook.docroot)||(elt===document.body))
                        continue;
                    var anchor=
                        fdjtDOM("span.tocref.headtext",
                                fdjtDOM("span.spacer","\u00A7"),
                                hinfo.title);
                    anchor.setAttribute("data-tocref",hinfo.frag);
                    var newspan=fdjtDOM("span.head"," ",anchor);
                    newspan.setAttribute("data-href",hinfo.frag);
                    anchor.title=
                        ((hinfo.title)?('jump to the section: '+hinfo.title):
                         "(jump to this section)");
                    if (target===head) fdjtDOM(curspan,newspan);
                    else fdjtDOM(curspan," \u22ef ",newspan);
                    curspan=newspan;}}}
        var tochead=fdjtDOM("div.tochead",
                            makelocrule(info,false),
                            basespan);
        tochead.title=makelocstring(info,false);
        return tochead;}

    /* Selecting a subset of glosses to display */

    var hasClass=fdjtDOM.hasClass;

    function selectSources(slice,sources){
        var sourcerefs=[], sourcedb=metaBook.sourcedb;
        if ((!(sources))||(sources.length===0)) {
            slice.filter(false); return;}
        var i=0; var lim=sources.length; while (i<lim) {
            var source=sourcedb.ref(sources[i++]);
            if (source) sourcerefs.push(source);}
        slice.filter(function(card){
            var gloss=card.gloss;
            return ((gloss)&&
                    ((RefDB.contains(sourcerefs,gloss.maker))||
                     (RefDB.overlaps(sourcerefs,gloss.sources))||
                     (RefDB.overlaps(sourcerefs,gloss.shared))));});}
    metaBook.UI.selectSources=selectSources;

    /* Results handlers */

    var named_slices={};

    function MetaBookSlice(container,cards,sortfn,opts){
        if (!(opts)) opts={};
        if (typeof container === "undefined") return false;
        else if (!(this instanceof MetaBookSlice))
            return new MetaBookSlice(container,cards,sortfn,opts);
        else if (!(container)) 
            container=fdjtDOM("div.metabookslice");
        else if (typeof container === "string") {
            if (named_slices.hasOwnProperty(container))
                return named_slices[container];
            else if (document.getElementById(container)) 
                container=document.getElementById(container);
            else return false;}
        else if ((container.nodeType)&&
                 (container.nodeType===1)&&
                 (container.id)) {
            if (named_slices.hasOwnProperty(container.id))
                return named_slices[container.id];
            else named_slices[container.id]=container;}
        else if ((container.nodeType)&&(container.nodeType===1))  {}
        else return false;
        if (!(opts.hasOwnProperty('initlayout')))
            opts.initLayout=false;
        if (!(opts.hasOwnProperty('noslip')))
            opts.noslip=false;
        if (!(opts.hasOwnProperty('id')))
            opts.id=container.id;
        if (!(opts.hasOwnProperty('holdmsecs')))
            opts.holdmsecs=400;
        if (opts.hasOwnProperty('holdclass'))
            opts.holdclass=false;
        if (opts.hasOwnProperty('touchtoo'))
            opts.touchtoo=function(evt){
                evt=evt||window.event;
                if (metaBook.previewing)
                    metaBook.stopPreview("touchtoo",true);
                this.abort(evt,"touchtoo");};
        if (container.id)
            metaBook.TapHold[container.id]=new fdjtUI.TapHold(
                container,opts);
        else fdjtUI.TapHold(container,opts);
        metaBook.UI.addHandlers(container,'summary');
        this.container=container; this.cards=[];
        if (sortfn) this.sortfn=sortfn;
        this.byid=new fdjt.RefMap();
        this.byfrag=new fdjt.RefMap();
        this.live=false; this.needupdate=false;
        this.addCards(cards);
        if (metaBook.touch) opts.packthresh=40;
        if ((cards)&&(cards.length)) this.update();
        return this;}

    MetaBookSlice.prototype.setLive=function setSliceLive(flag){
        if (flag) {
            if (this.live) return false;
            else {
                if (this.needupdate) this.update();
                this.live=true;
                return true;}}
        else if (this.live) {
            this.live=false;
            return true;}
        else return false;};

    MetaBookSlice.prototype.renderCard=function renderCardForSlice(about){
        return renderCard(about);};

    MetaBookSlice.prototype.sortfn=function defaultSliceSortFn(x,y){
        if (x.hasOwnProperty('location')) {
            if (y.hasOwnProperty("location")) {
                if (x.location===y.location) {
                    if (x.timestamp) {
                        if (y.timestamp)
                            return x.timestamp-y.timestamp;
                        else return -1;}
                    else return 1;}
                else return x.location-y.location;}
            else return -1;}
        else return 1;};

    MetaBookSlice.prototype.getCard=function getCard(ref){
        if ((ref.nodeType===1)&&
            ((hasClass(ref,"metabookcard"))||
             (hasClass(ref,"mbtoc")))) {
            var id=ref.getAttribute("data-gloss")||
                ref.getAttribute("data-passage");
            return this.byid.get(id);}
        else if (ref.nodeType===1) {
            if (!(ref.id)) ref=getFirstID(ref);
            if (ref) return this.byid.get(ref.id)||
                this.byfrag.get(ref.id);}
        else return ((ref._qid)&&(this.byid.get(ref._qid)))||
            ((ref._id)&&(this.byid.get(ref._id)));};
    function getFirstID(node){
        if (node.id) return node;
        else if (node.childNodes) {
            var children=node.childNodes;
            var i=0; var lim=children.length; while (i<lim) {
                if (children[i].nodeType===1) {
                    var found=getFirstID(children[i++]);
                    if (found) return found;}
                else i++;}}
        return false;}

    MetaBookSlice.prototype.update=function updateSlice(){
        if (metaBook.Trace.slices)
            fdjtLog("Updating slice %o over %o",
                    this,this.container);
        var cards=this.cards, visible=[], shown=[];
        var byfrag=this.byfrag;
        var container=this.container;
        cards.sort(this.sortfn);
        dropClass($(".slicenewpassage",container),"slicenewpassage");
        dropClass($(".slicenewhead",container),"slicenewhead");
        this.container.innerHTML="";
        var head=false, passage=false;
        var frag=document.createDocumentFragment()||this.container;
        var i=0, lim=cards.length; while (i<lim) {
            var card=cards[i++];
            if (card.hidden) continue;
            else if (card.passage!==passage) {
                passage=card.passage;
                byfrag[passage]=card;
                addClass(card.dom,"slicenewpassage");}
            if (card.head!==head) {
                head=card.head;
                addClass(card.dom,"slicenewhead");}
            frag.appendChild(card.dom);
            visible.push(card);
            shown.push(card.dom);}
        if (frag!==this.container) this.container.appendChild(frag);
        showPage.update(container);
        this.visible=visible;
        this.shown=shown;
        this.needupdate=false;};

    MetaBookSlice.prototype.refresh=function refreshSlice(force){
        var slice=this;
        if ((!(this.needupdate))&&(!(force))) return;
        if (this.refresh_timer) {
            clearTimeout(this.refresh_timer);
            this.refresh_timer=false;}
        this.refresh_timer=setTimeout(
            function(){slice_update(slice);},
            2000);};
    function slice_update(slice){
        slice.refresh_timer=false;
        slice.needupdate=false;
        slice.update(); if (slice.needupdate)
            slice.refresh();}

    MetaBookSlice.prototype.filter=function filterSlice(fn){
        var cards=this.cards; var i=0, n=cards.length;
        if (metaBook.Trace.slices) {
            if (fn) fdjtLog("Filtering slice %o by %o",this.container,fn);
            else fdjtLog("Restoring filtered slice %o",this.container);}
        if (!(fn)) while (i<n) delete cards[i++].hidden;
        else while (i<n) {
            var card=cards[i++];
            if (fn(card)) card.hidden=false;
            else card.hidden=true;}
        this.filterfn=fn;
        this.needupdate=true;
        this.update();};

    MetaBookSlice.prototype.addCards=function addCards(adds){
        if (!(adds)) return;
        if (!(adds instanceof Array)) adds=[adds];
        if (adds.length===0) return;
        if (metaBook.Trace.slices) 
            fdjtLog("Adding %d cards to slice %o",
                    adds.length,this.container);
        var byid=this.byid, cards=this.cards;
        var i=0, lim=adds.length;
        while (i<lim) {
            var add=adds[i++], info=false, card, id, about=false, replace=false;
            if ((add.about)&&(add.dom)) {
                info=add; card=add.dom;}
            if ((add.nodeType)&&(add.nodeType===1)&&
                     (hasClass(add,"metabookcard"))) {
                card=add; id=add.name||add.getAttribute("name");
                if (!(id)) continue;
                if ((info=byid[id])) {
                    if (info.dom!==add) replace=byid[id].dom;
                    card=add; info.dom=add;}
                else card=add;}
            else if (add instanceof Ref) {
                id=add._qid||add.getQID(); about=add;
                if (byid[id]) {info=byid[id]; card=info.dom;}
                else card=this.renderCard(add);}
            else {}
            if (!(card)) continue;
            if (!(about)) about=RefDB.resolve(id);
            if (!(info)) 
                byid[id]=info={added: fdjtTime(),id: id,about: about};
            info.dom=card;
            if (card.getAttribute("data-location"))
                info.location=parseInt(card.getAttribute("data-location"),10);
            if (card.getAttribute("data-gloss"))
                info.gloss=metaBook.glossdb.refs[card.getAttribute("data-gloss")];
            if (card.getAttribute("data-searchscore"))
                info.score=parseInt(card.getAttribute("data-searchscore"),10);
            if (card.getAttribute("data-timestamp"))
                info.timestamp=parseInt(card.getAttribute("data-timestamp"),10);
            if (card.getAttribute("data-passage")) 
                info.passage=card.getAttribute("data-passage");
            if (card.getAttribute("data-tochead"))
                info.head=card.getAttribute("data-tochead");
            if (this.filterfn) {
                var fn=this.filterfn;
                if (fn(info))
                    info.hidden=false;
                else info.hidden=true;}
            if (replace) this.container.replaceChild(card,replace);
            else cards.push(info);}
        this.needupdate=true;
        if (this.live) this.refresh();};

    /* Slice handlers */

    MetaBookSlice.prototype.setSkim=function setSkim(card){
        var visible=this.visible, shown=this.shown;
        var off=((card.nodeType)?(shown.indexOf(card)):(visible.indexOf(card)));
        if (off<0) return; else {
            card=shown[off];
            if (this.skimpoint) dropClass(this.skimpoint,"skimpoint");
            this.skimpoint=card; this.skimpos=off;
            this.atStart=(off===0);
            this.atEnd=(off>=(visible.length-1));
            addClass(card,"skimpoint");
            return card;}};
    MetaBookSlice.prototype.forward=
        function skimForward(card){
            var shown=this.shown;
            if (!(card)) card=this.skimpoint||shown[0];
            var off=shown.indexOf(card);
            if ((off<0)||(off+1>=this.visible.length))
                return; 
            else return this.setSkim(shown[off+1]);};
    MetaBookSlice.prototype.backward=
        function skimBackward(card){
            var shown=this.shown;
            if (!(card)) card=this.skimpoint||shown[shown.length-1];
            var off=shown.indexOf(card);
            if (off<=0) return; 
            else return this.setSkim(shown[off-1]);};
    MetaBookSlice.prototype.getInfo=function getSliceInfo(card){
        if (typeof card === "string") {
            var found=this.byid.get(card)||this.byfrag.get(card);
            if ((Array.isArray(found))&&(found.length))
                card=found[0];
            else card=found;}
        var pos; if (!(card)) pos=this.skimpos;
        else if ((pos=this.shown.indexOf(card))<0)
            pos=this.visible.indexOf(card);
        if (pos>=0) return this.visible[pos];
        else return false;};

    MetaBookSlice.prototype.setLocation=function setSliceLocation(location){
        var visible=this.visible; var i=0, lim=visible.length;
        while (i<lim) {
            var card=visible[i];
            if (typeof card.location !== "number") {i++; continue;}
            else if (card.location>=location) {
                this.setSkim(card);
                return;}
            else {i++; continue;}}};

    function getCard(target){
        if ((hasClass(target,"metabookcard"))||(hasClass(target,"mbtoc")))
            return target;
        else return getParent(target,".metabookcard,.mbtoc")||
            getChild(target,".metabookcard,.mbtoc");}

    function slice_tapped(evt){
        var target=fdjtUI.T(evt);
        if (Trace.gestures)
            fdjtLog("slice_tapped %o: %o",evt,target);
        if (metaBook.previewing) {
            // Because we're previewing, this slice is invisible, so
            //  the user really meant to tap on the body underneath,
            //  so we stop previewing and jump there We might try to
            //  figure out exactly which element was tapped somehow
            metaBook.stopPreview("slice_tapped",true);
            fdjtUI.cancel(evt);
            return;}
        if ((getParent(target,".ellipsis"))&&
            ((getParent(target,".elision"))||
             (getParent(target,".delision")))) {
            fdjtUI.Ellipsis.toggle(target);
            fdjtUI.cancel(evt);
            return;}
        if (getParent(target,".tochead")) {
            var anchor=getParent(target,".tocref");
            var href=(anchor)&&(anchor.getAttribute("data-tocref"));
            metaBook.SkimTo(href);
            fdjtUI.cancel(evt);
            return;}

        if (getParent(target,".mbmedia")) {
            var link=getParent(target,".mbmedia");
            var src=link.getAttribute("data-src"), cancel=false;
            var type=link.getAttribute("data-type");
            if (hasClass(link,"imagelink")) {
                metaBook.showMedia(src,type); cancel=true;}
            else if ((hasClass(link,"audiolink"))||
                     (hasClass(link,"musiclink"))) {
                metaBook.showMedia(src,type); cancel=true;}
            else {}
            if (cancel) {
                fdjtUI.cancel(evt);
                return;}}
        var card=getCard(target);
        var passage=mbID(card.getAttribute("data-passage"));
        var glossid=card.getAttribute("data-gloss");
        var gloss=((glossid)&&(metaBook.glossdb.ref(glossid)));
        if (!(passage)) return;
        else if ((!(gloss))&&(passage)) {
            metaBook.SkimTo(card,0);
            return fdjtUI.cancel(evt);}
        else if (getParent(target,".tool")) {
            var form=metaBook.setGlossTarget(gloss);           
            if (!(form)) return;
            metaBook.setMode("addgloss");
            return fdjtUI.cancel(evt);}
        else if (mB.mode==="openglossmark") {
            mB.clearGlossmark();
            goToGloss(card); 
            return fdjtUI.cancel(evt);}
        else if (getParent(target,".glossbody"))  {
            var detail=((gloss)&&(gloss.detail));
            if (!(detail)) return;
            else if (detail[0]==='<')
                $ID("METABOOKGLOSSDETAIL").innerHTML=gloss.detail;
            else if (detail.search(/^{(md|markdown)}/)===0) {
                var close=detail.indexOf('}');
                $ID("METABOOKGLOSSDETAIL").innerHTML=
                    metaBook.md2HTML(detail.slice(close+1));}
            else $ID("METABOOKGLOSSDETAIL").innerHTML=
                metaBook.md2HTML(detail);
            metaBook.setMode("glossdetail");
            return fdjtUI.cancel(evt);}
        else {
            metaBook.SkimTo(card,0);
            return fdjtUI.cancel(evt);}}
    function slice_held(evt){
        evt=evt||window.event;
        var slice_target=fdjtUI.T(evt), card=getCard(slice_target);
        if (Trace.gestures)
            fdjtLog("slice_held %o: %o, skimming=%o",
                    evt,card,metaBook.skimpoint);
        if (!(card)) return;
        /* Handle openglossmarks */
        if ((card.getAttribute("data-gloss"))&&
            (mB.mode==="openglossmark")) {
            goToGloss(card); return fdjtUI.cancel(evt);}
        // Put a clone of the card in the skimmer
        var clone=card.cloneNode(true);
        clone.id="METABOOKSKIM"; fdjtDOM.replace("METABOOKSKIM",clone);
        // If we're currently previewing something, clear it
        if (metaBook.previewTarget) {
            var drop=metaBook.getDups(metaBook.previewTarget);
            dropClass(drop,"mbpreviewing");
            metaBook.clearHighlights(drop);
            metaBook.previewTarget=false;}

        // Get the attributes of this card
        var passageid=card.getAttribute("data-passage");
        var glossid=card.getAttribute("data-gloss");
        var gloss=((glossid)&&metaBook.glossdb.ref(glossid));
        var passage=mbID(passageid), show_target=false;
        var dups=metaBook.getDups(passageid);
        // Set up for preview
        metaBook.previewTarget=passage; addClass(dups,"mbpreviewing");
        if ((gloss)&&(gloss.excerpt)) {
            // Highlight the gloss excerpt
            var range=metaBook.findExcerpt(dups,gloss.excerpt,gloss.exoff);
            if (range) {
                var starts=range.startContainer;
                if (!(getParent(starts,passage)))
                    // This is the case where the glosses excerpt
                    //  starts in a 'dup' generated by page layout
                    show_target=getTargetDup(starts,passage);
                fdjtUI.Highlight(range,"mbhighlightexcerpt");}}

        if (getParent(card,".sbookresults")) {
            // It's a search result, so highlight any matching terms
            var terms=metaBook.query.tags;
            var info=metaBook.docinfo[passageid];
            // knodeterms match tags to their originating strings
            var spellings=info.knodeterms;
            var i=0; var lim=terms.length; while (i<lim) {
                var term=terms[i++];
                var highlights=metaBook.highlightTerm(term,passage,info,spellings);
                if (!(show_target))
                    if ((highlights)&&(highlights.length)&&
                        (!(getParent(highlights[0],passage))))
                        show_target=getTargetDup(highlights[0],passage);}}
        metaBook.startPreview(show_target||passage,"slice_held");
        return fdjtUI.cancel(evt);}
    function slice_released(evt){
        var card=getCard(fdjtUI.T(evt||window.event));
        var glossid=(card)&&(card.getAttribute("data-gloss"));
        if (Trace.gestures) {
            fdjtLog("slice_released %o: %o, skimming=%o",evt,card);}
        if (metaBook.previewing)
            metaBook.stopPreview("slice_released");
        if ((glossid)&&(mB.mode==="openglossmark")) goToGloss(card);
        fdjtUI.cancel(evt);}
    function slice_slipped(evt){
        evt=evt||window.event;
        var rel=evt.relatedTarget||fdjtUI.T(evt);
        if (!(hasParent(rel,".metabookslice"))) {
            metaBook.slipTimeout(function(){
                if (Trace.gestures)
                    fdjtLog("slice_slipped/timeout %o",evt);
                metaBook.stopPreview("slice_slipped");});}}
    function slice_touchtoo(evt){
        evt=evt||window.event;
        metaBook.previewTimeout(false);
        if (!(metaBook.previewing)) return;
        else if (Trace.gestures) {
            fdjtLog("slice_touchtoo %o noabout",evt);
            metaBook.stopPreview("toc_touchtoo",true);}
        else {
            metaBook.stopPreview("toc_touchtoo",true);}
        fdjtUI.cancel(evt);}

    function slice_swiped(evt){
        var dx=evt.deltaX, dy=evt.deltaY;
        var vw=fdjtDOM.viewWidth();
        var adx=((dx<0)?(-dx):(dx)), ady=((dy<0)?(-dy):(dy));
        var target=fdjtUI.T(evt);
        var slice=getParent(target,".metabookslice");
        if (Trace.gestures)
            fdjtLog("slice_swiped d=%o,%o, ad=%o,%o, s=%o,%o vw=%o, n=%o",
                    dx,dy,adx,ady,evt.startX,evt.startY,vw,evt.ntouches);
        if (adx>(ady*2)) {
            // Horizontal swipe
            if (dx<(-(metaBook.minswipe||10))) {
                if (metaBook.skimming)
                    metaBook.skimForward();
                else showPage.forward(slice);}
            else if (dx>(metaBook.minswipe||10)) {
                if (metaBook.skimming)
                    metaBook.skimBackward();
                else showPage.backward(slice);}}
        else if (ady>(adx*2)) {
            // Vertical swipe
            if (!(metaBook.hudup)) {
                // Ignore really short swipes 
                if (ady<=(metaBook.minswipe||10)) return;
                else if ((evt.startX<(vw/5))&&(dy<0))
                    // On the left, up, show help
                    metaBook.setMode("help");
                else if ((evt.startX<(vw/5))&&(dy>0))
                    // On the left, down, show TOC
                    metaBook.setMode("statictoc");
                else if ((evt.startX>(vw*0.8))&&(dy>0))
                    // On the right, down, show SEARCH
                    metaBook.setMode("search");
                else if ((evt.startX>(vw*0.8))&&(dy<0))
                    // On the right, up, show GLOSSES
                    metaBook.setMode("allglosses");
                else if (dy>0) {
                    metaBook.clearStateDialog();
                    metaBook.showCover();}
                else metaBook.setHUD(true);}
            else if (dy<-(metaBook.minswipe||10)) metaBook.setMode("allglosses");
            else if (dy>(metaBook.minswipe||10)) metaBook.setMode("search");}
        else {}}

    metaBook.UI.getCard=getCard;

    function goToGloss(card){
        var glossid=card.getAttribute("data-gloss");
        var glosscard=(glossid)&&(mB.allglosses.byid[glossid]);
        if (glosscard) {
            metaBook.setMode("allglosses");
            fdjt.Async(function(){
                mB.allglosses.setSkim(glosscard);});}}
    
    fdjt.DOM.defListeners(
        metaBook.UI.handlers.mouse,
        {summary: {tap: slice_tapped, hold: slice_held,
                   release: slice_released, click: generic_cancel,
                   slip: slice_slipped}});

   fdjt.DOM.defListeners(
        metaBook.UI.handlers.touch,
        {summary: {tap: slice_tapped,
                   hold: slice_held,
                   release: slice_released,
                   touchtoo: slice_touchtoo,
                   swipe: slice_swiped,
                   slip: slice_slipped}});

    return MetaBookSlice;

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
