/* -*- Mode: Javascript; -*- */

var sbooks_hud_id="$Id$";
var sbooks_hud_version=parseInt("$Revision$".slice(10,-1));

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

/* Making the icon */

var sbook_preview_icon="binoculars24x24.png";

function sbookPreviewIcon()
{
  var img=fdjtImage(sbicon("binoculars24x24.png"),"previewicon","[pre]",
		    "hold mouse or control for preview; click to jump");
  img.onmouseover=sbookPreview_onmouseover;
  img.onmouseout=sbookPreview_onmouseout;
  // img.onmousemove=sbookPreview_onmousemove;
  img.onmousedown=sbookPreview_onmousedown;
  img.onmouseup=sbookPreview_onmouseup;
  img.onclick=sbookPreview_onclick;
  return img;
}

/* Preview handlers */

var sbook_preview_delay=500;
var sbook_preview_clickmax=1500;
var sbook_preview_hysteresis=1000;

function sbookPreview_onmouseover(evt)
{
  evt=evt||event||null;
  // sbook_trace("preview_mouseover",evt);
  var target=$T(evt);
  var ref=sbookGetRef(target);
  if (ref===sbook_preview_target) return;
  sbook_preview_target=ref;
  if ((sbook_preview)&&(!((evt.ctrlKey)||(evt.button))))
    sbookPreview(false);
  else if ((ref)&&((evt.ctrlKey)||(evt.button)))
    sbookPreview(ref);
}

function sbookPreview_onmousemove(evt)
{
  evt=evt||event||null;
  // sbook_trace("preview_mousemove",evt);
  var target=$T(evt);
  var ref=sbookGetRef(target);
  if (ref===sbook_preview_target) return;
  sbook_preview_target=ref;
  if ((sbook_preview)&&(!((evt.ctrlKey)||(evt.button))))
    sbookPreview(false);
  else if ((ref)&&(evt.ctrlKey))
    sbookPreview(ref);
}

function sbookPreview_onmouseout(evt)
{
  evt=evt||event||null;
  // sbook_trace("preview_mouseout",evt);
  sbookPreview(false);
}

function sbookPreview_onmousedown(evt)
{
  evt=evt||event||null;
  // sbook_trace("preview_mousedown",evt);
  var target=$T(evt);
  if (fdjtIsClickactive(target)) return;
  fdjtCancelEvent(evt);
  if ((sbook_preview)&&(!(evt.ctrlKey))) {
    sbookPreview(false);
    return;}
  sbook_preview_mousedown=fdjtTime();
  var ref=sbookGetRef($T(evt));
  if (ref) sbookPreview(ref);
}

function sbookPreview_onmouseup(evt)
{
  evt=evt||event||null;
  // sbook_trace("preview_mouseup",evt);
  var down=sbook_preview_mousedown;
  sbook_preview_mousedown=false;
  // Still down, don't stop
  if (evt.ctrlKey) return;
  if (document.body.preview) {
    clearTimeout(document.body.preview);
    document.body.preview=false;}
  var ref=sbookGetRef($T(evt));
  if ((ref)&&((fdjtTime()-down)>sbook_preview_clickmax)) {
    sbookPreview(false);
    fdjtCancelEvent(evt);
    return false;}
}

function sbookPreview_onclick(evt)
{
  var target=$T(evt);
  fdjtCancelEvent(evt);
}

/* Emacs local variables
;;;  Local variables: ***
;;;  compile-command: "cd ..; make" ***
;;;  End: ***
*/
