//
//The MIT License (MIT)
//
//Copyright (c) 2015 Satoshi Fujiwara
//
//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:
//
//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

/// <reference path="..\intellisense\q.intellisense.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/d3/3.5.2/d3.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/q.js/1.0.1/q.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/three.js/r70/three.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.js" />
/// <reference path="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/js/bootstrap.min.js" />

"use strict";

var fs = require('fs');
var https = require('https');
var request = require('request');
var q = require('q');
//var d3 = require('d3');
var gui = require('nw.gui');
var Uploader = require('node-youtube-resumable-upload');
var cr = require('crypto');
var player;
var playerWidth = 640;
var playerHeight = 360;
var fetchController;
var json = q.nfbind(d3.json);
var apiEntryPonint = 'https://www.googleapis.com/youtube/v3/';
var apikeys;
var tokens;
var authWindow;
var spawn = require('child_process').spawn;

var sfkey = (JSON.parse(fs.readFileSync('key.json','utf-8'))).key;

// OAuth認証を行う
// 認証用のウィンドウを開き、承認処理を行った後アクセストークンをもらう
function doOAuth() {
  var defer = q.defer();
  // OAuth認証を行う //
  var url = 'https://accounts.google.com/o/oauth2/auth?client_id=' 
          + apikeys.clientId + '&redirect_uri=' + encodeURIComponent('urn:ietf:wg:oauth:2.0:oob') 
          + '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/youtube') 
          + '&response_type=code&access_type=offline';
  
  //// 認証ページに飛ぶ //
  authWindow = gui.Window.open(url);
  authWindow.on('loaded', function () {
    //var this_ = this;
    var title = authWindow.title;
    // 承認をクリックしていただいた
    if (title.match(/Success\scode/)) {
      var code = title.split('=')[1];
      console.log('Auth Success.' + code);
      // アクセストークン・リフレッシュトークンをもらう
      (function () {
        var form 
            = 'code=' + encodeURIComponent(code) + '&' 
            + 'client_id=' + encodeURIComponent(apikeys.clientId) + '&' 
            + 'client_secret=' + encodeURIComponent(apikeys.clientSecret) + '&' 
            + 'redirect_uri=' + encodeURIComponent('urn:ietf:wg:oauth:2.0:oob') + '&' 
            + 'grant_type=authorization_code';
        
        var options = {
          url: 'https://accounts.google.com/o/oauth2/token',
          body: form,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': form.length
          }
        };
        
        var result = q.defer();
        q.nfcall(request.post, options)
        .then(function (response) {
          console.log(response[1]);
          result.resolve(JSON.parse(response[1]));
        })
        .catch(function (e) {
          result.reject(e);
        });
        
        return result.promise;
      })()
      .then(function (tokens_) {
        defer.resolve(tokens_);
        authWindow.close(true);
      }).catch(function (e) {
        defer.reject(e);
        authWindow.close(true);
      });
    }
    // キャンセルされたもしくは他のエラーが発生した
    if (title.match(/error/)) {
      authWindow.close();
      defer.reject('認証中にエラーが発生しました。' + title);
    }
  });
  return defer.promise;
}

// リフレッシュトークンの取得
function refreshToken() {
  var result = q.defer();
  var form 
    = 'client_id=' + encodeURIComponent(apikeys.clientId) + '&' 
    + 'client_secret=' + encodeURIComponent(apikeys.clientSecret) + '&' 
    + 'refresh_token=' + encodeURIComponent(tokens.refresh_token) + '&' 
    + 'grant_type=refresh_token';
  
  var options = {
    url: 'https://accounts.google.com/o/oauth2/token',
    body: form,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': form.length
    }
  };
  q.nfcall(request.post, options)
  .then(function (response) {
    console.log(response[1]);
    result.resolve(JSON.parse(response[1]));
  })
  .catch(function (e) {
    result.reject(e);
  });  
  return result.promise;
}

// ビューモデル
function ViewModel(){
  var this_ = this;
  
  this.inputDataValidated = ko.pureComputed(
    function (){
      return this_.input.inputAudioFile.value() 
        && this_.input.inputImageFile.value() 
        && this_.output.outputFile.value()
        && !this_.isProcessing()
    }
  );
  
  this.isProcessing = ko.observable(false);

  this.openFileDialog = function (fileDialogId) {
    d3.select(fileDialogId).node().click();
  };
  
  this.encodeAndUpload = function (){
    encodeAndUpload();
  }
  // 入力パラメータ
  this.input = {
    loop: { label: 'loop', paramName: 'loop', value: ko.observable('1') },
    f: {label:'f',paramName:'f',value:ko.observable('image2') },
    r: {label:'r(input)',paramName:'r',value:ko.observable('30') },
    inputImageFile: { label: '画像/動画ファイル', paramName: 'i', value: ko.observable(null) },
    inputAudioFile: { label: '音声ファイル', paramName: 'i', value: ko.observable(null), type: 'file' }
  }

  // 出力パラメータ
  this.output = {
    ro: {label:'r(output)',paramName:'r',value:ko.observable('30') },
    vcodec: { label: 'vcodec', paramName: 'vcodec', value: ko.observable('libx264') },
    b_v: { label:'b:v',paramName: 'b:v', value: ko.observable('5000k') },
    pass: { label:'pass',paramName: 'pass', value: ko.observable('1') },
    crf: {label:'crf',paramName:'crf',value:ko.observable('15') },
    s: {label:'s',paramName:'s',value:ko.observable('1280x720') },
    fs: {label:'fs',paramName:'fs',value:ko.observable('') },
    preset: {label:'preset',paramName:'preset',value:ko.observable('placebo') },
    tune: {label:'tune',paramName:'tune',value:ko.observable('stillimage') },
    pix_fmt: {label:'pix_fmt',paramName:'pix_fmt',value:ko.observable('yuv420p') },
    movflags: {label:'movflags',paramName:'movflags',value:ko.observable('+faststart') },
    threads: {label:'threads',paramName:'threads',value:ko.observable('') },
    acodec: {label:'acodec',paramName:'acodec',value:ko.observable('') },
    ab: {label:'ab',paramName:'ab',value:ko.observable('') },
    ac: {label:'ac',paramName:'ac',value:ko.observable('') },
    b_a: {label:'b:a',paramName:'b:a',value:ko.observable('') },
    q_a: {label:'q:a',paramName:'q:a',value:ko.observable('') },
    vbr: {label:'vbr',paramName:'vbr',value:ko.observable('') },
    ss: {label:'ss',paramName:'ss',value:ko.observable('') },
    t: {label:'t',paramName:'t',value:ko.observable('') },
    shortest: {label:'shortest',paramName:'shortest',value:ko.observable(true) ,type:'checkbox'},
    application: {label:'application',paramName:'application',value:ko.observable('audio') },
    outputFile: { label: '出力ファイル', paramName: 'o', value: ko.observable(null), type: 'file' , nwsaveas :'nwsaveas'}
  }
  
 
  // YouTubeパラメータ　//
  this.youtube = {
    title:  {label:'タイトル',paramName:'title',value:ko.observable('') },
    description: { label: '説明', paramName: 'description', value: ko.observable('')  },
    tags: { label: 'タグ', paramName: 'tags', value: ko.observable('') },
    categoryId: { label: 'カテゴリー', paramName: 'categoryId', value: ko.observable('') },
    privacyStatus: {
      label: '公開範囲', paramName: 'privacyStatus', value: ko.observable(''), type: 'select',
      options: ['private', 'public','unlisted']
    },
    embeddable: { label: '埋め込み可能', paramName:'embeddable',value:ko.observable(''), type:'checkbox'},
    license: {
      label: 'ライセンス', paramName: 'license', value: ko.observable(''), type:'select',
      options:['creativeCommon','youtube']
    },
    publicStatsViewable: { label: '拡張統計情報を一般公開', paramName:'publicStatsViewable',value:ko.observable(''), type:'checkbox'}

    //'snippet': { label:'タイトル',paramName:'',
    //  "title": "テスト",
    //  "description": "test"
    //},
    //"status": {
    //  "privacyStatus": "private"
    //}
  }

  // 出力
  this.console = {
    output: {label:'Output',paramName:'Output',value:ko.observable(''),type:'output'}
  }

  this.outputStr = function (str){
    this_.console.output.value(str);
  }
  
  // viewModelをJSONデータとして保存する
  this.save = function () {
    fs.writeFileSync('./viewModel.json',ko.mapping.toJSON(this_),'utf8');
  }
  
  // JSONデータを読み込む
  this.load = function () {

    try {
      var model = fs.readFileSync('./viewModel.json', 'utf8');
      if (model) {
        model = JSON.parse(model);
        //ko.mapping.fromJS(model, {observe:['audio.b_a.value']},this_);
        (function update(m, v) {
          if (ko.isWritableObservable(v)) {
            v(m);
          } else {
            if (typeof v == "object") {
              for (var i in v) {
                update(m[i], v[i]);
              }
            }
          }
        })(model, this_);
        console.log(this_);
      }
    } catch (e) {
    }
  }

  this.render = function (){
    render();
  }
  this.preview = function(){
    render(true);
  }
}


var viewModel = new ViewModel();
viewModel.load();
// ViewModelとのバインド
ko.applyBindings(viewModel);

window.addEventListener('message',function(event){
  if(event.data == "end"){
    if(renderWindow){
      renderWindow.close();
      renderWindow = null;
    }
    //alert('render end');
  }
});

var renderWindow = null;

function render(preview){
  var url = './contents/rydeen001/index.html'
  if(preview){
    url += '?preview';
  }
  renderWindow = gui.Window.open(url, {
    position: 'center',
    width: 1280,
    height:720
  });
  renderWindow.window.postMessage('startRender');

  //win.on('close',function(){
  //  encode();
  //});
}

gui.Window.get().on('closed', function () {
  alert('closed');
  viewModel.outputStr('');
  viewModel.input.inputAudioFile.value('');
  viewModel.isProcessing(false);
  //viewModel.input.inputImageFile.value('');
  viewModel.output.outputFile.value('');
  viewModel.save();
});

var outtext = '';

// Main
function main() {
  var options = {
    url: 'http://www.enoie.net/keys/YouTubeApp.json',
    headers: {
      'User-Agent' : 'sfpgapplication'
    }
  };
  q.nfcall(request.get,options)
  .then(function (request) {
    // あまり意味はないが。。
    try {
      var decipher = cr.createDecipher('aes-256-cbc', sfkey);
      var decrypto = decipher.update(request[1], 'hex', 'utf8');
      decrypto += decipher.final('utf8');
      var apikeys_ = decrypto;
      apikeys = JSON.parse(apikeys_);
    } catch (e) {
      console.log(e);
    }
    // まずローカルストレージにトークンが存在するか確認する
    tokens = localStorage.getItem('tokens');
    if (tokens) {
      tokens = JSON.parse(tokens);
      // トークンのリフレッシュを行う。
      refreshToken()
      .then(function (refreshTokens) {
        tokens.access_token = refreshTokens.access_token;
        tokens.expires_in = refreshTokens.expires_in;
        tokens.token_type = refreshTokens.token_type;
        localStorage.setItem('tokens', JSON.stringify(tokens));
      })
      .catch(function (e) {
        alert('認証中にエラーが発生しました。' + e);
        console.log(title);
        gui.Window.get().close();
      });
    } else {
      doOAuth()
      .then(function (tokens_) {
        tokens = tokens_;
        localStorage.setItem('tokens', JSON.stringify(tokens));
      })
      .catch(function (e) {
        alert('認証中にエラーが発生しました。' + e);
        console.log(title);
        gui.Window.get().close();
      });
    }
  });
}

// upload スクリプト
function upload() {
  refreshToken();
  console.log('upload start!!');
  var uploader = new Uploader();
  var yt = viewModel.youtube;
  uploader.tokens = tokens;
  uploader.metadata = {
    "snippet": {
      "title": yt.title.value(),
      "description": yt.description.value(),
      "tags" : yt.tags.value().split(',') || [],
      "categoryId": yt.categoryId.value() || ""
    },
    "status": {
      "privacyStatus": yt.privacyStatus.value(),
      "embeddable": yt.embeddable.value(),
      "license": yt.license.value(),
      "publicStatsViewable":yt.publicStatsViewable.value()
    }
  };
  uploader.filepath = viewModel.output.outputFile.value();
  uploader.monitor = true;
  uploader.retry = -1;
 // uploader.on('progress', function (progress) {
 //   console.log(progress);
 // });
  
  q.ninvoke(uploader, 'initUpload')
    .then(function (result) {
    outtext += result;
    viewModel.outputStr(outtext);
  })
  .catch(function (err) {
    outtext += err;
    viewModel.outputStr(outtext);
  });
   
}

// 動画をエンコードしてアップロードする
function encodeAndUpload(){
  encode();
}

// エンコード
function encode(){
  var defer = q.defer();
  var params = ko.mapping.toJS(viewModel);
  var paramArray = [];
  for (var i in params.input) {
    var param = params.input[i];
    if (param.value.length > 0) {
      paramArray.push('-' + param.paramName, param.value);
    }
  }
  
  //for (var i in params.movie) {
  //  var param = params.movie[i];
  //  if (param.value.length > 0) {
  //    paramArray.push('-' + param.paramName, param.value);
  //  }
  //}
  
  //for (var i in params.audio) {
  //  var param = params.audio[i];
  //  if (param.value.length > 0) {
  //    paramArray.push('-' + param.paramName, param.value);
  //  }
  //}

 
  for (var i in params.output) {
    var param = params.output[i];
    if (i == 'shortest') {
      if (param.value) {
        paramArray.push('-shortest');
      }
    } else if(i == 'outputFile'){
      paramArray.push(param.value);
    } else {
      if (param.value.length > 0) {
        paramArray.push('-' + param.paramName, param.value);
      }
    }
  }
  
  paramArray.push(/*viewModel.output.outputFile.value(),*/ '-y');
  //var ffmpeg = spawn('./ffmpeg/ffmpeg', ['-loop', '1', '-i', './test.png', '-i', './Rydeen.wav', '-shortest', './test.mp4', '-y']);
  var ffmpeg = spawn('./ffmpeg/ffmpeg', paramArray);
  viewModel.isProcessing(true);
  
  ffmpeg.stdout.on('data', function (data) {
    outtext += data + '\n';
    viewModel.outputStr(outtext);
  });
  
  ffmpeg.stderr.on('data', function (data) {
    outtext += data + '\n';
    defer.reject(data);
    viewModel.outputStr(outtext);
  });
  
  ffmpeg.on('exit', function (code) {
    outtext += 'exit code: ' + code + '\n';
    viewModel.outputStr(outtext);
    viewModel.isProcessing(false);
    upload();
//  なぜかdeferが効かない。。
//    defer.resolve();
  });
//  return defer.promise;
}

main();
