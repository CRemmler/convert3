var app = require('express')();
var http = require('http').Server(app);
var express = require('express');
var fs = require("node-fs");
var JSZip = require("jszip");
var formidable = require('formidable');
var Promise = require("bluebird");
Promise.promisifyAll(fs);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.post('/fileupload',function(req,res){
   var form = new formidable.IncomingForm();
   //var guid = (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
   form.parse(req, function(err, fields, files) {
     var activityType = fields['modelType'];
     fields["legacyHubnet"] = (activityType == "legacyHubnet") ? true : false;
     var title;
     var nlogoFilename1 = undefined;
     var nlogoFilename2 = undefined;
     switch (activityType) {
       case "legacyHubnet": 
         if (files.hubnetfiletoupload) {
           title = files.hubnetfiletoupload.name;
           nlogoFilename1 = files.hubnetfiletoupload.path || "error";
         }
         break;
       case "gbccFlat": 
         if (files.userfiletoupload) {
           title = files.userfiletoupload.name;
           nlogoFilename1 = files.userfiletoupload.path || "error";
         }
          break;
       case "gbccHierarchical":
         if (files.teacherfiletoupload) {
           title = files.teacherfiletoupload.name;
           nlogoFilename1 = files.teacherfiletoupload.path || "error";
         }
         if (files.studentfiletoupload) {
           nlogoFilename2 = files.studentfiletoupload.path || "error"; 
         }
         break;
       default:
         break;
     }
     var filename = title.substr(0,title.indexOf("."));
     
     console.log(fields);
     
     console.log(fields["modelType"]);
     console.log(files.userfiletoupload.name);
     console.log(files.teacherfiletoupload.name);
     console.log(files.studentfiletoupload.name);
     console.log(files.hubnetfiletoupload.name);
     
     
     
     
     //var title = files.filetoupload.name;
     //var filename = title.substr(0,title.indexOf("."));
     //nlogoFileName = files.filetoupload.path || "error";
     //userfiletoupload
     //teacherfiletoupload
     //studentfiletoupload
     //hubnetfiletoupload
     /*
     allowTeacherControls
     allowMultipleLayers
     allowMultipleSelections
     allowCanvasForeverButtons
     allowGalleryControls
     */
    
     var configFile;
     var nlogoFile;
     var indexFile;
     var loginWidgerRange, studentWidgetRange, teacherWidgetRange;
     var widgetList = [];
     var codeList = [];
     var secondViewData = [];
     var nlogoFileData;
     var numTeacherWidgets = 0;
     var numStudentWidgets = 0;
     var arrayIndex, array;
     var widgets = ["BUTTON", "SLIDER", "SWITCH", "CHOOSER", "INPUTBOX", "MONITOR", "OUTPUT", "TEXTBOX", "VIEW", "GRAPHICS-WINDOW", "PLOT"];
     var viewWidgets = ["VIEW", "GRAPHICS-WINDOW"];

     fs.readFileAsync(nlogoFilename1, "utf8").then(function(data) {
        if (activityType === "legacyHubnet") {
          nlogoFileData = data;
          var sanitizedFileContents = removeUnimplementedPrimCalls(data.toString());
          array = sanitizedFileContents.split("\n");
          nlogoFile = "";
          arrayIndex = 0;
          var widget = "";
          var newWidget = false;
          var lastWidgetType = "";
          var label;
          for(i in array) {
            // buttons on the client need a client-procedure, to avoid a console error
            if (arrayIndex === 0 && array[i] === "@#$#@#$#@") { nlogoFile = nlogoFile + "\n\nto client-procedure\nend\n"; }
            nlogoFile += array[i] + "\n";
            if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numTeacherWidgets++; } }
            if (arrayIndex === 8) {
              if ((widgets.indexOf(array[i]) > -1) || (array[i]==="@#$#@#$#@")) {
                if ((array[i] != "VIEW") && (array[i]!="@#$#@#$#@")) { numStudentWidgets++; }
                switch (lastWidgetType) {
                  case "BUTTON":
                    widget = widget.substr(0,widget.lastIndexOf("NIL"))+"NIL\nNIL\nNIL\n"+widget.lastIndexOf("NIL")+"\n\n";
                    widget = widget.replace("NIL","client-procedure");
                    if (widget.split("NIL").length === 5) { widget = widget.replace("NIL\nNIL","NIL\nNIL\nNIL"); }
                    break;
                  case "MONITOR":
                    widget = widget.substr(0,widget.indexOf("NIL"))+'""'+"\n0\n1\n11\n";
                    //widget = widget.replace("NIL",label+"\n0");
                    break;
                  case "CHOOSER":
                    var widgetLines = widget.split("\n");
                    widgetLines[7]  = widgetLines[7].replace(/\\"/g, "\"");
                    widget          = widgetLines.join("\n");
                }
                if ((widget != "") && (viewWidgets.indexOf(lastWidgetType) === -1)) {
                  widgetList.push(widget);
                  widget = "";
                }
                lastWidgetType = array[i];
                label = array[(parseInt(i) + 5).toString()];
              }
              if (lastWidgetType != "VIEW") { widget += array[i] + "\n"; }
            }
            if (array[i] === "@#$#@#$#@") { arrayIndex++; }
          }
          teacherWidgetRange = [0, numTeacherWidgets - 1];
          studentWidgetRange = (numStudentWidgets === 0) ? teacherWidgetRange : [numTeacherWidgets, numTeacherWidgets + numStudentWidgets - 1];
          loginWidgetRange = [(numTeacherWidgets + numStudentWidgets), (numTeacherWidgets + numStudentWidgets)];
          var oldNlogoFile = nlogoFile;
          array = oldNlogoFile.toString().split("\n");
          nlogoFile = "";
          arrayIndex = 0;
          for (i in array) {
            if (array[i] === "@#$#@#$#@") {
              arrayIndex++;
              if (arrayIndex === 2) {
                for (var j=0; j<widgetList.length; j++) {
                  nlogoFile += widgetList[j] + "\n";
                }
              }
            }
            nlogoFile += array[i] + "\n";
          }
        } else {
          array = data.toString().split("\n");
          arrayIndex = 0;
          for(i in array) {
            if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numTeacherWidgets++; } }
            if (array[i] === "@#$#@#$#@") { arrayIndex++; }
          }
          teacherWidgetRange = [0, numTeacherWidgets - 1];
          studentWidgetRange = teacherWidgetRange;
          loginWidgetRange = [numTeacherWidgets, numTeacherWidgets];
          nlogoFile = "";
          arrayIndex = 0;
          for (i in array) {
            if (array[i] === "@#$#@#$#@") {
              arrayIndex++;
            }
            nlogoFile += array[i] + "\n";
          }
        }
     }).then(function() {
        if (nlogoFilename2 === undefined) { nlogoFilename2 = nlogoFilename1; }
        fs.readFileAsync(nlogoFilename2, "utf8").then(function(data) {
          if (activityType === "gbccHierarchical") {
            array = data.toString().split("\n");
            arrayIndex = 0;
            for(i in array) {
              if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numStudentWidgets++; } }
              if (array[i] === "@#$#@#$#@") { arrayIndex++; }
            }
            studentWidgetRange = (numStudentWidgets === 0) ? teacherWidgetRange : [numTeacherWidgets, numTeacherWidgets + numStudentWidgets - 1];
            loginWidgetRange = [(numTeacherWidgets + numStudentWidgets), (numTeacherWidgets + numStudentWidgets)];
            arrayIndex = 0;
            for (i in array) {
              if (array[i] === "@#$#@#$#@") {
                arrayIndex++;
              }
              //save widgetList
              if (arrayIndex === 1) {
                if ((widgets.indexOf(array[i]) > -1) || (array[i]==="@#$#@#$#@")) {
                  if (array[i] == "VIEW") {
                  }
                  if ((array[i] != "VIEW") && (array[i]!="@#$#@#$#@")) { numStudentWidgets++; }
                  if ((widget != "") && (viewWidgets.indexOf(lastWidgetType) === -1)) {
                    widgetList.push(widget);
                    widget = "";
                  }
                  lastWidgetType = array[i];
                }
                if (lastWidgetType === "VIEW") { 
                  secondViewData.push(array[i]); 
                } else {
                  widget += array[i] + "\n"; 
                }
              }
              if (arrayIndex === 0) {
                code += array[i] + "\n";              
              }
              if (array[i] === "@#$#@#$#@") { arrayIndex++; }
            }
            array = nlogoFile;
            nlogoFile = "";
            
            for (i in array) {
              if (array[i] === "@#$#@#$#@") {
                arrayIndex++;
                if (arrayIndex === 1) {
                  nlogoFile += code;
                }
                if (arrayIndex === 2) {
                  for (var j=0; j<widgetList.length; j++) {
                    nlogoFile += widgetList[j] + "\n";
                  }
                }
              }
              nlogoFile += array[i] + "\n";
            }
          }
          
          
          
          
          
        /*nlogoFileData = data;
        var sanitizedFileContents = removeUnimplementedPrimCalls(data.toString());
        var array = sanitizedFileContents.split("\n");
        nlogoFile = "";
        var numTeacherWidgets = 0;
        var numStudentWidgets = 0;
        var arrayIndex = 0;
        var widget = "";
        var newWidget = false;
        var lastWidgetType = "";
        var label;
        var widgets = ["BUTTON", "SLIDER", "SWITCH", "CHOOSER", "INPUTBOX", "MONITOR", "OUTPUT", "TEXTBOX", "VIEW", "GRAPHICS-WINDOW", "PLOT"];
        var viewWidgets = ["VIEW", "GRAPHICS-WINDOW"];

        for(i in array) {
          // buttons on the client need a client-procedure, to avoid a console error
          if (arrayIndex === 0 && array[i] === "@#$#@#$#@") { nlogoFile = nlogoFile + "\n\nto client-procedure\nend\n"; }
          nlogoFile += array[i] + "\n";
          if (arrayIndex === 1) { if (widgets.indexOf(array[i]) > -1) { numTeacherWidgets++; } }
          if (arrayIndex === 8) {
            if ((widgets.indexOf(array[i]) > -1) || (array[i]==="@#$#@#$#@")) {
              if ((array[i] != "VIEW") && (array[i]!="@#$#@#$#@")) { numStudentWidgets++; }
              switch (lastWidgetType) {
                case "BUTTON":
                  widget = widget.substr(0,widget.lastIndexOf("NIL"))+"NIL\nNIL\nNIL\n"+widget.lastIndexOf("NIL")+"\n\n";
                  widget = widget.replace("NIL","client-procedure");
                  if (widget.split("NIL").length === 5) { widget = widget.replace("NIL\nNIL","NIL\nNIL\nNIL"); }
                  break;
                case "MONITOR":
                  widget = widget.substr(0,widget.indexOf("NIL"))+'""'+"\n0\n1\n11\n";
                  //widget = widget.replace("NIL",label+"\n0");
                  break;
                case "CHOOSER":
                  var widgetLines = widget.split("\n");
                  widgetLines[7]  = widgetLines[7].replace(/\\"/g, "\"");
                  widget          = widgetLines.join("\n");
              }
              if ((widget != "") && (viewWidgets.indexOf(lastWidgetType) === -1)) {
                widgetList.push(widget);
                widget = "";
              }
              lastWidgetType = array[i];
              label = array[(parseInt(i) + 5).toString()];
            }
            if (lastWidgetType != "VIEW") { widget += array[i] + "\n"; }

          }
          if (array[i] === "@#$#@#$#@") { arrayIndex++; }
        }
        teacherWidgetRange = [0, numTeacherWidgets - 1];
        studentWidgetRange = (numStudentWidgets === 0) ? teacherWidgetRange : [numTeacherWidgets, numTeacherWidgets + numStudentWidgets - 1];
        loginWidgetRange = [(numTeacherWidgets + numStudentWidgets), (numTeacherWidgets + numStudentWidgets)];
        var oldNlogoFile = nlogoFile;
        var array = oldNlogoFile.toString().split("\n");
        nlogoFile = "";
        arrayIndex = 0;
        for (i in array) {
          if (array[i] === "@#$#@#$#@") {
            arrayIndex++;
            if (arrayIndex === 2) {
              for (var j=0; j<widgetList.length; j++) {
                nlogoFile += widgetList[j] + "\n";
              }
            }
          }
          nlogoFile += array[i] + "\n";
        }
        */
        //console.log(nlogoFile);
      }).then(function() {
      fs.readFileAsync("gbcc/config.json", "utf8").then(function(data) {
        console.log(nlogoFile);
         var array = data.toString().split("\n");
         var configData = data;
         configFile = "";
         for(var i in array) {
           configFile += array[i] + "\n";
           if (array[i].includes("loginComponents"))   { configFile += '      "componentRange": [' +loginWidgetRange + "]\n" }
           if (array[i].includes("teacherComponents")) { configFile += '      "componentRange": [' +teacherWidgetRange + "]\n" }
           if (array[i].includes("studentComponents")) { configFile += '      "componentRange": [' +studentWidgetRange + "]\n" }
         
           if (array[i].includes("galleryJs")) {
             configFile += (fields["allowTabs"]) ?                 '    "allowTabs": true, \n' :                 '    "allowTabs": false, \n';
             configFile += (fields["allowMultipleLayers"]) ?       '    "allowMultipleLayers": true, \n' :       '    "allowMultipleLayers": false, \n';
             configFile += (fields["allowMultipleSelections"]) ?   '    "allowMultipleSelections": true, \n' :   '    "allowMultipleSelections": false, \n';
             configFile += (fields["allowCanvasForeverButtons"]) ? '    "allowCanvasForeverButtons": true, \n' : '    "allowCanvasForeverButtons": false, \n';
             configFile += (fields["allowGalleryControls"]) ?      '    "allowGalleryCon": true, \n' :  '    "allowGalleryForeverButton": false, \n';
             configFile += (fields["allowTeacherControls"]) ?      '    "allowTeacherControls": true, \n' :       '    "allowTeacherControls": false, \n';
             configFile += (fields["legacyHubnet"]) ?              '    "legacyHubnet": true, \n' :                '    "legacyHubnet": false, \n';
             configFile +=                                         '    "secondViewData": "' +secondViewData +   '\n';
           
           } 
         }
      }).then(function() {
      fs.readFileAsync("gbcc/index1.html", "utf8").then(function(data) {
         indexFile = "";
         var array = data.toString().split("\n");
         for (i in array) { indexFile += array[i] + "\n"; }
         indexFile += "\ndocument.title = '"+title+"';\n</script>";
         indexFile += "\n<script type='text/nlogo' id='nlogo-code' data-filename='"+title+"'>";
         indexFile += nlogoFile;
      }).then(function() {
      fs.readFileAsync("gbcc/index3.html", "utf8").then(function(data) {
         var array = data.toString().split("\n");
         for (i in array) { indexFile += array[i] + "\n"; }
      }).then(function() {
        var zip = new JSZip();
        zip.file("config.json", configFile);
        zip.file("index.html", indexFile);
        zip.file(title, nlogoFileData);
        
        fs.readFileAsync("gbcc/css/gallery.css", "utf8").then(function(data) {
           zip.file("css/gallery.css", data);
        }).then(function() {
        fs.readFileAsync("gbcc/css/font-awesome.min.css", "utf8").then(function(data) {
           zip.file("css/font-awesome.min.css", data);
        }).then(function() {
        fs.readFileAsync("gbcc/css/style.css", "utf8").then(function(data) {
           zip.file("css/style.css", data);
        }).then(function() {
        fs.readFileAsync("gbcc/js/client.js", "utf8").then(function(data) {
           zip.file("js/client.js", data);
        }).then(function() {
        fs.readFileAsync("gbcc/js/events.js", "utf8").then(function(data) {
           zip.file("js/events.js", data);
        }).then(function() {           
         fs.readFileAsync("gbcc/js/gallery.js", "utf8").then(function(data) {
            zip.file("js/gallery.js", data);
        }).then(function() {            
        fs.readFileAsync("gbcc/js/interface.js", "utf8").then(function(data) {
           zip.file("js/interface.js", data);
        }).then(function() {
        fs.readFileAsync("gbcc/js/jquery.min.js", "utf8").then(function(data) {
           zip.file("js/jquery.min.js", data);
        }).then(function() {
        fs.readFileAsync("gbcc/images/glacier.jpg").then(function(data) {
           zip.file("images/glacier.jpg", data);
        }).then(function() {
        fs.readFileAsync("gbcc/images/poppyfield.jpg").then(function(data) {
           zip.file("images/poppyfield.jpg", data); 
        }).then(function() {
        fs.readFileAsync("gbcc/images/seashore.jpg").then(function(data) {
          zip.file("images/seashore.jpg", data);
        }).then(function() {  
        fs.readFileAsync("gbcc/fonts/fontawesome-webfont.eot").then(function(data) {
           zip.file("fonts/fontawesome-webfont.eot", data);
        }).then(function() {
        fs.readFileAsync("gbcc/fonts/fontawesome-webfont.svg").then(function(data) {
          zip.file("fonts/fontawesome-webfont.svg", data);
        }).then(function() {
        fs.readFileAsync("gbcc/fonts/fontawesome-webfont.ttf").then(function(data) {
          zip.file("fonts/fontawesome-webfont.ttf", data);
        }).then(function() {       
        fs.readFileAsync("gbcc/fonts/fontawesome-webfont.woff").then(function(data) {
          zip.file("fonts/fontawesome-webfont.woff", data);
        }).then(function() {
        fs.readFileAsync("gbcc/fonts/fontawesome-webfont.woff2").then(function(data) {
          zip.file("fonts/fontawesome-webfont.woff2", data);
        }).then(function() { 
        fs.readFileAsync("gbcc/export/exportworld.js", "utf8").then(function(data) {
           zip.file("export/exportworld.js", data);
        }).then(function() {
        fs.readFileAsync("gbcc/package.json", "utf8").then(function(data) {
           zip.file("package.json", data);
        }).then(function() {
        fs.readFileAsync("gbcc/readme.md", "utf8").then(function(data) {
           zip.file("readme.md", data);
        }).then(function() {
        fs.readFileAsync("gbcc/server.js", "utf8").then(function(data) {
           zip.file("server.js", data);
        }).then(function() {
        zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
          .pipe(fs.createWriteStream(filename+'.zip'))
          //.on('finish', function () {
            //res.download(filename+'.zip', function() {
              //var fullPath= __dirname + '/'+filename+'.zip';
              //console.log(fullPath);
              //fs.unlink(fullPath, function() {
              //  console.log(fullPath + " deleted");
              //});
          //  });
          //});
        }).catch(function(e) {
          res.sendfile('index.html');
          console.error(e.stack);
        }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); }); });
     });
   });
});

function S4() {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

// String -> String
function removeUnimplementedPrimCalls(fileContents) {
  var firstSepIndex     = fileContents.indexOf("@#$#@#$#@");
  var nlogoCode         = fileContents.slice(0, firstSepIndex);
  var remainder         = fileContents.slice(firstSepIndex);
  var sanitizedLines    = nlogoCode.split("\n").map(function(line) { return line.replace(/(\s*)(hubnet-reset\s*(?:;.*)?)/, "$1;$2") });
  var sanitizedContents = sanitizedLines.join("\n") + remainder;
  return sanitizedContents;
}

app.get('/', function(req, res){
	res.sendfile('index.html');
});

http.listen(PORT, function(){
	console.log('listening on ' + PORT );
});
