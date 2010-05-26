/* -*- Mode: Javascript; -*- */

var sbooks_social_id="$Id$";
var sbooks_social_version=parseInt("$Revision$".slice(10,-1));

/* Copyright (C) 2009 beingmeta, inc.
   This file implements a Javascript/DHTML UI for reading
    large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knowlets, visit www.knowlets.net
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

var sbook_sources=false;
var sbook_glosses_target=false;
var sbookGlossesHUD=false;
var sbookSourceHUD=false;

// The highlighted glossmark
var sbook_glossmark=false;
var sbook_glossmark_qricons=false;

// The glosses element
var sbookHUDglosses=false;
// The user/tribe bar
var sbookHUDsocial=false;

/* Social UI components */

function sbicon(name,suffix) {return sbook.graphics+name+(suffix||"");}

function sbookAddSourceIcon(info)
{
  if (typeof info === 'string') info=fdjtKB.ref(info);
  var humid=info.humid;
  var icon=fdjtID("SBOOKSOURCEICON"+humid);
  if (icon) return icon;
  if (!(info.name)) return;
  var pic=info.pic; var kind=info.kind;
  if (pic) {}
  else if (kind===':PERSON')
    pic=sbicon("sbooksperson40x40.png");
  else if (kind===':CIRCLE')
    pic=sbicon("sbookscircle40x40.png");
  else if (kind===':OVERDOC')
    pic=sbicon("sbooksoverdoc40x40.png");
  else pic=sbook;
  icon=fdjtDOM.Image
    (pic,".button.source",info.name|info.kind,
     ("click to show/hide glosses from "+info.name));
  icon.oid=info.oid; icon.id="SBOOKSOURCEICON"+humid;
  fdjtDOM(fdjtID("SBOOKSOURCES")," ",icon);
  return icon;
}

function sbookEveryoneButton_onclick(evt)
{
  evt=evt||event||null;
  var target=fdjtDOM.T(evt);
  var sources=fdjtDOM.getParent(target,".sbooksources");
  var glosses=fdjtDOM.getParent(target,".sbookglosses");
  var summaries=fdjtDOM.$(".sbooksummaries",glosses)[0];
  var new_sources=[];
  if ((!(sources))||(!(glosses)))
    return; /* Warning? */
  if (fdjtDOM.hasClass(target,"selected")) {
    sbookMode(false);
    fdjtDOM.cancel(evt);
    return;}
  var selected=fdjtDOM.$(".selected",sources);
  fdjtLog("Everyone click sources=%o glosses=%o selected=%o/%d",
	  sources,glosses,selected,selected.length);
  fdjtDOM.toggleClass(selected,"selected");
  fdjtDOM.addClass(target,"selected");
  sbookSelectSources(summaries,false);
  fdjtDOM.cancel(evt);
}

function sbookSources_onclick(evt)
{
  evt=evt||event||null;
  // if (!(sbook.user)) return;
  var target=fdjtDOM.T(evt);
  var sources=fdjtDOM.getParent(target,".sbooksources");
  var glosses=fdjtDOM.getParent(target,".sbookglosses");
  var summaries=fdjtDOM.$(".sbooksummaries",glosses)[0];
  var new_sources=[];
  if ((!(sources))||(!(glosses))||(!(target.oid)))
    return; /* Warning? */
  if ((evt.shiftKey)||(fdjtDOM.hasClass(target,"selected"))) {
    fdjtDOM.toggleClass(target,"selected");
    var selected=fdjtDOM.$(".selected",sources);
    var i=0; var len=selected.length;
    while (i<len) {
      var oid=selected[i++].oid;
      if (oid) new_sources.push(oid);}}
  else {
    var selected=fdjtDOM.$(".selected",sources);
    var i=0; var len=selected.length;
    while (i<len) fdjtDOM.dropClass(selected[i++],"selected");
    fdjtDOM.addClass(target,"selected");
    new_sources=[target.oid];}
  var everyone=fdjtDOM.$(".everyone",sources)[0];
  if (new_sources.length) {
    if (everyone) fdjtDOM.dropClass(everyone,"selected");
    sbookSelectSources(summaries,new_sources);}
  else {
    if (everyone) fdjtDOM.addClass(everyone,"selected");
    sbookSelectSources(summaries,false);}
  fdjtDOM.cancel(evt);
}

function sbookSetSources(overlays,sources)
{
  var children=overlays.childNodes;
  var i=0; while (i<children.length) {
    var child=children[i++];
    if (child.nodeType===1) {
      if ((fdjtKB.position(sources,child.oid)>=0) ||
	  (fdjtKB.overlaps(sources,child.oid)))
	fdjtDOM.addClass(child,"sourced");
      else fdjtDOM.dropClass(child,"sourced");}}
}
sbook.setSources=sbookSetSources;

function sbookScrollGlosses(elt,glosses)
{
  fdjtLog("Scrolling glosses to %o",elt);
  var info=sbook.docinfo[elt.id];
  if ((info)&&(info.sbookloc)) {
    var targetloc=info.sbookloc;
    if (!(glosses)) glosses=fdjtID("SBOOKALLGLOSSES");
    var children=glosses.childNodes;
    /* We do this linearly for now because it's fast enough and
       simpler. */
    var i=0; var len=children.length; while (i<len) {
      var child=children[i++];
      if (child.nodeType===1) {
	if ((child.blockloc) &&
	    (child.blockloc>=targetloc) &&
	    (child.offsetHeight>0)) {
	  var off=fdjtDOM.getGeometry(child,false,glosses);
	  glosses.scrollTop=off.top;
	  return;}}}}
}

function gather_tags(elt,results)
{
  if (!(results)) results=[];
  var tags=elt.tags;
  if ((tags) && (tags.length>0)) {
    var i=0; while (i<tags.length) results.push(tags[i++]);}
  // don't do this for now
  // if (elt.parentNode) gather_tags(elt.parentNode,results);
  if (elt.head) {
    var head=elt.head; var htags=head.tags;
    if ((htags) && (htags.length>0)) {
      var i=0; while (i<htags.length) results.push(htags[i++]);}}
  return results;
}

/* Displaying glossmarks */

function sbookGlossmark(target,open)
{
  if ((target)&&(target.glossmarkid))
    return fdjtID(target.glossmarkid);
  var id=((target)&&(target.id));
  var title=((target)&&(target.getAttribute('title')));
  var tags=((target)?(gather_tags(target)):[]);
  var sources=((id)?(sbookGetSourcesUnder(id)):[]);
  var imgsrc=((target)?(sbicon("sbookspeople32x32.png")):
	      (sbicon("remarkballoon32x32.png")));
  // By default the glossmark image is the user when unique
  if (sources.length===1) imgsrc=(sbook.sources.map[sources[0]].pic)||imgsrc;
  var glossmark=fdjtDOM
    ("span.glossmark",
     fdjtDOM.Image(imgsrc,"big","comments"),
     fdjtDOM.Image(sbicon("sbicon16x16.png"),"tiny","+"));
  glossmark.onclick=sbookGlossmark_onclick;
  glossmark.onmousedown=fdjtDOM.cancel;
  glossmark.onmouseover=sbookGlossmark_onmouseover;
  glossmark.onmouseout=sbookGlossmark_onmouseout;
  if (id) {
    target.glossmarkid=glossmark.id="SBOOK_GLOSSMARK_"+id;
    glossmark.sbook_ref=id;}
  if ((target)&&(sbook_glossmark_qricons)) {
    var qrhref="http://"+sbook.server+"/sbook/qricon.fdcgi?"+
      "URI="+encodeURIComponent(sbook.refuri)+
      ((id)?("&FRAG="+id):"")+
      ((title) ? ("&TITLE="+encodeURIComponent(title)) : "");
    var i=0; while (i<tags.length) qrhref=qrhref+"&TAGCUE="+tags[i++];
    fdjtDOM.prepend(target,fdjtDOM.Image(qrhref,"sbookqricon"));}
  if (target) {
    fdjtDOM.addClass(target,"glossed");
    fdjtDOM.prepend(target,glossmark);}
  glossmark.sbookui=true;
  return glossmark;
}
sbook.Glossmark=sbookGlossmark;

var sbook_glossmark_div=false;
var sbook_glossmark_target=false;

function sbookOpenGlossmark(target,addmark)
{
  if (sbook_glossmark_target===target) {
    var hud=fdjtID("SBOOKMARKHUD");
    hud.style.maxHeight=((fdjtDOM.viewHeight())-100);
    sbookMode("mark");}
  else {
    var hud=fdjtID("SBOOKMARKHUD");
    var glosses=sbook.glosses.find('frag',target.id)
    var sumdiv=fdjtDOM("div.sbooksummaries");
    sbookSetupSummaryDiv(sumdiv);
    if (glosses)
      sbookShowSummaries(glosses,sumdiv,false);
    fdjtDOM.replace("SBOOKMARKGLOSSES",sumdiv);
    sbook.setTarget(target);
    sbook_glossmark_target=target;
    sbookMarkHUDSetup(target);
    sbookAlignGlossmark(hud,target);
   if (addmark)
      fdjtDOM.dropClass(fdjtID("SBOOKMARKFORM"),"closed");
    else fdjtDOM.addClass(fdjtID("SBOOKMARKFORM"),"closed");
    sbookMode("mark");}
}

function sbookAlignGlossmark(hud,target)
{
  return;
  var offinfo=fdjtDOM.getGeometry(target);
  hud.style.maxHeight=((fdjtDOM.viewHeight())-100)+'px';
  hud.style.opacity=0.0; hud.style.display='block';
  var hudinfo=fdjtDOM.getGeometry(hud);
  var minoff=(fdjtDOM.viewTop()+(fdjtDOM.viewHeight()))-hudinfo.height;
  if (offinfo.top<minoff) 
    hud.style.top=offinfo.top+'px';
  else hud.style.top=minoff+'px';
  hud.style.opacity=''; hud.style.display='';
}

function sbookGlossmark_onclick(evt)
{
  evt=evt||event||null;
  var target=sbook.getRef(fdjtUI.T(evt));
  if (sbook_glossmark_target===target)
    if (sbook.mode) sbookMode(false);
    else sbookOpenGlossmark(target,false);
  else sbookOpenGlossmark(target,false);
}

function sbookGlossmark_onmouseover(evt)
{
  evt=evt||event||null;
  var target=sbook.getRef(fdjtUI.T(evt))||sbookGetFocus(fdjtUI.T(evt));
  fdjtDOM.addClass(target,"sbooklivespot");
}

function sbookGlossmark_onmouseout(evt)
{
  evt=evt||event||null;
  var target=sbook.getRef(fdjtUI.T(evt))||sbook.getFocus(fdjtUI.T(evt));
  fdjtDOM.dropClass(target,"sbooklivespot");
}

function createSBOOKHUDping()
{
  var wrapper=fdjtDOM("div#SBOOKMARK.sbookping.hudblock.hud");
  var iframe=fdjtDOM("iframe#SBOOKMARKFRAME");
  iframe.src="";
  iframe.hspace=0; iframe.vspace=0;
  iframe.marginHeight=0; iframe.marginWidth=0;
  iframe.border=0; iframe.frameBorder=0;
  fdjtDOM(wrapper,iframe);
  wrapper.onfocus=function (evt){
    iframe.src=
    sbook_glossmark_uri
    (sbook.refuri,
     sbook.head.id,
     sbook.head.title||document.title||"",
     false);};
  return wrapper;
}

/* Emacs local variables
;;;  Local variables: ***
;;;  compile-command: "cd ..; make" ***
;;;  End: ***
*/
