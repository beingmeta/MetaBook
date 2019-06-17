if ((typeof _metareader_suppressed === "undefined")||(!(_metareader_suppressed))) {
    metaReader.appInit();
    if (document.addEventListener) {
	document.addEventListener("load",metaReader.headReady);
	document.addEventListener("DOMContentLoaded",metaReader.bodyReady);
        window.onload=metaReader.domReady;}
    else window.onload=function(evt){metaReader.Setup();};}

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
