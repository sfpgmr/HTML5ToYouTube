/// <reference path="../../../scripts/dsp.js" />
/// <reference path="../../../scripts/three/three.js" />
/// <reference path="http://localhost:8081/socket.io/socket.io.js" />
/// <reference path="graphics.js" />
/// <reference path="io.js" />
/// <reference path="song.js" />
/// <reference path="audio.js" />
/// <reference path="text.js" />
/// <reference path="util.js" />
/// <reference path="gameobj.js" />
/// <reference path="enemies.js" />
/// <reference path="effectobj.js" />
/// <reference path="myship.js" />
/// <reference path="game.js" />
/// <reference path="comm.js" />

var CONSOLE_WIDTH = 480.0;
var CONSOLE_HEIGHT = 640.0;
var VIRTUAL_WIDTH = CONSOLE_WIDTH / 2.0;
var VIRTUAL_HEIGHT = CONSOLE_HEIGHT / 2.0;
var V_RIGHT = VIRTUAL_WIDTH / 2.0;
var V_TOP = VIRTUAL_HEIGHT / 2.0;
var V_LEFT = -1 * VIRTUAL_WIDTH / 2.0;
var V_BOTTOM = -1 * VIRTUAL_HEIGHT / 2.0;

var CHAR_SIZE = 8;
var TEXT_WIDTH = VIRTUAL_WIDTH / CHAR_SIZE;
var TEXT_HEIGHT = VIRTUAL_HEIGHT / CHAR_SIZE;
var PIXEL_SIZE = 1;
var ACTUAL_CHAR_SIZE = CHAR_SIZE * PIXEL_SIZE;
var SPRITE_SIZE_X = 16.0;
var SPRITE_SIZE_Y = 16.0;
var CHECK_COLLISION = true;
//var STAGE_MAX = 1;


var renderer;
var stats;
var scene;
var camera;
var author;
var progress;
var textPlane;
var basicInput = new BasicInput();
var tasks = new Tasks();
var waveGraph;
var start = false;
var baseTime = +new Date;
var d = -0.2;
var audio;
var sequencer;
var piano;
var score = 0;
var highScore = 0;
var highScores = [];
var myShip;
var gameTimer;
var isHidden = false;
//var stageNo = 1;
var stage;
//var stageState = ;
var bombs;
var enemies;
var enemyBullets;
var PI = Math.PI;
var comm;
var handleName = '';
var storage;
var rank = -1;

function ScoreEntry(name, score) {
  this.name = name;
  this.score = score;
}

function Stage()
{
}

Stage.prototype = {
  MAX: 1,
  DIFFICULTY_MAX:2.0,
  no: 1,
  privateNo: 0,
  difficulty: 1,
  reset:function()
  {
    this.no = 1;
    this.privateNo = 0;
    this.difficulty = 1;
  },
  advance:function()
  {
    this.no++;
    this.privateNo++;

    if (this.difficulty < this.DIFFICULTY_MAX) {
      this.difficulty += 0.05;
    }

    if (this.privateNo >= this.MAX) {
      this.privateNo = 0;
    }
  }
}


// hidden プロパティおよび可視性の変更イベントの名前を設定
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 や Firefox 18 以降でサポート 
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.mozHidden !== "undefined") {
  hidden = "mozHidden";
  visibilityChange = "mozvisibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}


/// 現在時間の取得
function getCurrentTime() {
  return audio.audioctx.currentTime;
}
/// ブラウザの機能チェック
function checkBrowserSupport(output) {
  var content = '<img class="errorimg" src="http://public.blu.livefilestore.com/y2pbY3aqBz6wz4ah87RXEVk5ClhD2LujC5Ns66HKvR89ajrFdLM0TxFerYYURt83c_bg35HSkqc3E8GxaFD8-X94MLsFV5GU6BYp195IvegevQ/20131001.png?psid=1" width="479" height="640" class="alignnone" />';
  // WebGLのサポートチェック
  if (!Detector.webgl) {
    $('<div>').appendTo('#content').addClass('error').append(
      content + '<p class="errortext">ブラウザが<br/>WebGLをサポートしていないため<br/>動作いたしません。</p>');
    return false;
  }

  // Web Audio APIラッパー
  if (!audio.enable) {
    $('<div>').appendTo('#content').addClass('error').append(
      content + '<p class="errortext">ブラウザが<br/>Web Audio APIをサポートしていないため<br/>動作いたしません。</p>');
    return false;
  }

  // ブラウザがPage Visibility API をサポートしない場合に警告 
  if (typeof hidden === 'undefined') {
    $('<div>').appendTo('#content').addClass('error').append(
      content + '<p class="errortext">ブラウザが<br/>Page Visibility APIをサポートしていないため<br/>動作いたしません。</p>');
    return false;
  }

  if (typeof localStorage === 'undefined') {
    $('<div>').appendTo('#content').addClass('error').append(
      content + '<p class="errortext">ブラウザが<br/>Web Local Storageをサポートしていないため<br/>動作いたしません。</p>');
    return false;
  } else {
    storage = localStorage;
  }


  return true;

}

/// コンソール画面の初期化
function initConsole() {
  // レンダラーの作成
  renderer = new THREE.WebGLRenderer({ antialias: false,sortObjects: true });
  renderer.setSize(CONSOLE_WIDTH, CONSOLE_HEIGHT);
  renderer.setClearColorHex(0x000000, 1);
  renderer.domElement.id = 'console';
  renderer.domElement.className = 'console';
  renderer.domElement.style.zIndex = 0;

  $('#content').append(renderer.domElement);


  // Stats オブジェクト(FPS表示)の作成表示
  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';


  $('#content').append(stats.domElement);
  stats.domElement.style.left = renderer.domElement.clientWidth - stats.domElement.clientWidth + 'px';

  //2D描画コンテキストの表示

  /*      ctx = $('#info-display').css('z-index', 2);
        ctx = $('#info-display')[0].getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = "12px 'ＭＳ ゴシック'";*/


  // シーンの作成
  scene = new THREE.Scene();

  // カメラの作成
  camera = new THREE.PerspectiveCamera(90.0, CONSOLE_WIDTH / CONSOLE_HEIGHT);
  camera.position = new THREE.Vector3(0, 0, 120.0 * CONSOLE_HEIGHT / CONSOLE_WIDTH);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  //var camera = new THREE.Camera();
  //camera.position.z = 1.0;

  // ライトの作成
  //var light = new THREE.DirectionalLight(0xffffff);
  //light.position = new THREE.Vector3(0.577, 0.577, 0.577);
  //scene.add(light);

  //var ambient = new THREE.AmbientLight(0xffffff);
  //scene.add(ambient);
  renderer.clear();
  // 開始・停止ボタンの設定 //

  $('#Start').click(function () {
    if (!start) {
      start = true;
      $('#Start').text('Stop');
      tasks.clear();
      tasks.pushTask(init);
      tasks.pushTask(render,100000);
      game();
    } else {
      start = false;
      $('#Start').text('Start');
      audio.stop();
      sequencer.stop();
      comm.disconnect();
    }
  });

  // ソースコード表示ボタンの設定 //

  $('#Show-Code').click(function () {
    var code = $('#source-code');
    if (code.css('display') == 'none') {
      code.css('display', 'block');
      $('#Show-Code').text('ソース非表示');
    } else {
      code.css('display', 'none');
      $('#Show-Code').text('ソース表示');
    }

  });

  // 表示エリアの調整 //

  $('#content').height($('#console').height());
  $('#content').width($('#console').width());
  /*      $('#info-display').height($('#console').height());
        $('#info-display').width($('#console').width());*/
  $('#source-code').width($('#content').width());
  $('#source-code').height($('#content').height());
  $('#source-code').css('top', $('#navigation').height() + 'px');

}

/// エラーで終了する。
function ExitError(e) {
  //ctx.fillStyle = "red";
  //ctx.fillRect(0, 0, CONSOLE_WIDTH, CONSOLE_HEIGHT);
  //ctx.fillStyle = "white";
  //ctx.fillText("Error : " + e, 0, 20);
  ////alert(e);
  start = false;
  throw e;
}

function onVisibilityChange()
{
  var h = document[hidden];
  isHidden = h;
  if (h) {
    if(gameTimer.status == gameTimer.START)
    {
      gameTimer.pause();
      console.log(gameTimer.elapsedTime);
    }
    if (sequencer.status == sequencer.PLAY) {
      sequencer.pause();
    }
    //document.title = '(Pause) Galaxy Fight Game ';
  } else {
    if (gameTimer.status == gameTimer.PAUSE) {
      gameTimer.resume();
      console.log(gameTimer.elapsedTime);
    }
    if (sequencer.status == sequencer.PAUSE) {
      sequencer.resume();
    }
    //document.title = 'Galaxy Fight Game ';
    //game();
  }
}

/// メイン
$(window).ready(function () {


  $('#Start')[0].disabled = true;

  audio = new Audio();

  if (!checkBrowserSupport('#content')) {
    return;
  }

  sequencer = new Sequencer();
  piano = new Piano();
  soundEffects = new SoundEffects();


  document.addEventListener(visibilityChange, onVisibilityChange, false);

  /// ゲーム中のテクスチャー定義
  textureFiles = {
    loadCompletedCount: 0,
    totalTextureCount: 0,
    isLoadComplete: function () { return loadCompletedCount == totalTextureCount; },
    font: (new TextureFile('Font.png', textureFiles)),
    font1: (new TextureFile('Font2.png', textureFiles)),
    author: (new TextureFile('author.png', textureFiles)),
    title: (new TextureFile('TITLE.png', textureFiles)),
    myship: (new TextureFile('myship2.png', textureFiles)),
    enemy: (new TextureFile('enemy.png', textureFiles)),
    bomb: (new TextureFile('bomb.png',textureFiles))
  };


  /// ソースコード表示の準備
  $('#source-code').text($('html').html());

  gameTimer = new GameTimer();

  /// ゲームコンソールの初期化
  initConsole();
  // キー入力処理の設定 //
  $(document).keydown(function (e) { return basicInput.keydown(e); });
  $(document).keyup(function (e) { return basicInput.keyup(e); });

  /// リソースロードを待つ
  (function () {
    progress = new Progress();
    progress.mesh.position.z = 0.001;
    progress.render('Loading Resouces ...', 0);
    scene.add(progress.mesh);
    function loadResouces() {
      renderer.render(scene, camera);
      if (textureFiles.loadCompletedCount == textureFiles.totalTextureCount)
      {
        scene.remove(progress.mesh);
        //progress.render('Loading Complete.', 100);
        renderer.render(scene, camera);
        $('#Start')[0].disabled = false;
      } else {
        progress.render('Loading Resouces ...', (textureFiles.loadCompletedCount / textureFiles.totalTextureCount * 100) | 0);
        window.setTimeout(loadResources, 100);
      }
    }
    loadResouces();
  }
  )();

});

/// ゲームメイン
function game() {
  // タスクの呼び出し
  // メインに描画
  if (start) {
    requestAnimationFrame(game);
  }

    if (!isHidden) {
      try {
        tasks.checkSort();
        var arr = tasks.getArray();
        for (var i = 0 ; i < arr.length; ++i) {
          var task = arr[i];
          if (task != nullTask) {
            task.func(task.index);
          }
        }
        tasks.compress();
      } catch (e) {
        ExitError(e);
      }
    }
};

function render(taskIndex) {
    renderer.render(scene, camera);
    textPlane.render();
    stats.update();
}

function init(taskIndex) {

  scene = new THREE.Scene();
  enemies = new Enemies();
  enemyBullets = new EnemyBullets();
  bombs = new Bombs();
  stage = new Stage();
  spaceField = null;

  // ハンドルネームの取得
  handleName = storage.getItem('handleName') ;

  textPlane = new TextPlane();
 // textPlane.print(0, 0, "Web Audio API Test", new TextAttribute(true));
 // スコア情報 通信用
  comm = new Comm();

  scene.add(textPlane.mesh);


  //作者名パーティクルを作成
  {
    var canvas = $('<canvas>')[0];
    //$('body').append(canvas);
    var w = textureFiles.author.texture.image.width;
    var h = textureFiles.author.texture.image.height;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(textureFiles.author.texture.image, 0, 0);
    var data = ctx.getImageData(0, 0, w, h);
    var geometry = new THREE.Geometry();

    geometry.vert_start = [];
    geometry.vert_end = [];

    {
      var i = 0;

      for (var y = 0; y < h; ++y) {
        for (var x = 0; x < w; ++x) {
          var color = new THREE.Color();

          var r = data.data[i++];
          var g = data.data[i++];
          var b = data.data[i++];
          var a = data.data[i++];
          if (a != 0) {
            color.setRGB(r / 255.0, g / 255.0, b / 255.0);
            var vert = new THREE.Vector3(((x - w / 2.0)), ((y - h / 2)) * -1, 0.0);
            var vert2 = new THREE.Vector3(1200 * Math.random() - 600, 1200 * Math.random() - 600, 1200 * Math.random() - 600);
            geometry.vert_start.push(new THREE.Vector3(vert2.x - vert.x, vert2.y - vert.y, vert2.z - vert.z));
            geometry.vertices.push(vert2);
            geometry.vert_end.push(vert);
            geometry.colors.push(color);
          }
        }
      }
    }

    // マテリアルを作成
    //var texture = THREE.ImageUtils.loadTexture('images/particle1.png');
    var material = new THREE.ParticleBasicMaterial({
      size: 20, blending: THREE.AdditiveBlending,
      transparent: true, vertexColors: true, depthTest: false//, map: texture
    });

    author = new THREE.ParticleSystem(geometry, material);
    author.position = new THREE.Vector3(0.0, 0.0, 0.0);

    //mesh.sortParticles = false;
    //var mesh1 = new THREE.ParticleSystem();
    //mesh.scale.x = mesh.scale.y = 8.0;

    basicInput.bind();
    scene.add(author);
  }

  tasks.setNextTask(taskIndex, printAuthor());
}

/// 作者表示
function printAuthor() {
  var step = 0;
  var count = 1.0;
  var wait = 60;
  var proc_count = 0;
  basicInput.keyBuffer.length = 0;
  return function (taskIndex) {

    // 何かキー入力があった場合は次のタスクへ
    if (basicInput.keyBuffer.length > 0) {
      basicInput.keyBuffer.length = 0;
      step = 4;
    }

    switch (step) {
      // フェード・イン
      case 0:
        if (count <= 0.01) {
          count -= 0.0005;
        } else {
          count -= 0.0025;
        }
        if (count < 0.0) {
          author.rotation.x = author.rotation.y = author.rotation.z = 0.0;
          var end = author.geometry.vertices.length;

          for (var i = 0; i < end; ++i) {
            author.geometry.vertices[i].x = author.geometry.vert_end[i].x;
            author.geometry.vertices[i].y = author.geometry.vert_end[i].y;
            author.geometry.vertices[i].z = author.geometry.vert_end[i].z;
          }
          author.geometry.verticesNeedUpdate = true;
          step++;
        } else {
          var end = author.geometry.vertices.length;
          var v = author.geometry.vertices;
          var d = author.geometry.vert_start;
          var v2 = author.geometry.vert_end;
          for (var i = 0; i < end; ++i) {
            v[i].x = v2[i].x + d[i].x * count;
            v[i].y = v2[i].y + d[i].y * count;
            v[i].z = v2[i].z + d[i].z * count;
          }
          author.geometry.verticesNeedUpdate = true;
          author.rotation.x = author.rotation.y = author.rotation.z = count * 4.0;
          author.material.opacity = 1.0;
        }
        break;
        // 待ち
      case 1:
        if (author.material.size > 2) {
          author.material.size -= 0.5;
          author.material.needsUpdate = true;
        }
        if (! --wait) step++;
        break;
        //フェードアウト
      case 2:
        count += 0.05;
        author.material.opacity = 1.0 - count;
        if (count >= 1.0) {
          count = 1.0;
          wait = 60;
          step++;
        }
        break;
        // 少し待ち
      case 3:
        if (! --wait) {
          wait = 60;
          step++;
        }
        break;
        // 次のタスクへ
      case 4:
        {
          scene.remove(author);
          //scene.needsUpdate = true;
          tasks.setNextTask(taskIndex, initTitle);
        }
        break;
    }

    //progress.render("proccesing", count * 100);

    //ctx.fillStyle = "rgba(127,127,0,1.0)";
    //ctx.fillRect(0, 0, CONSOLE_WIDTH, CONSOLE_HEIGHT);
    //var backup = ctx.globalAlpha;
    //ctx.globalAlpha = count;
    //ctx.drawImage(imageFiles.font.image, (CONSOLE_WIDTH - imageFiles.font.image.width) / 2, (CONSOLE_HEIGHT - imageFiles.font.image.height) / 2);
    //ctx.globalAlpha = backup;
  };
}

var title;// タイトルメッシュ
var spaceField;// 宇宙空間パーティクル

/// タイトル画面初期化 ///
function initTitle(taskIndex) {
  basicInput.clear();

  // タイトルメッシュの作成・表示 ///
  var material = new THREE.MeshBasicMaterial({ map: textureFiles.title.texture });
  material.shading = THREE.FlatShading;
  //material.antialias = false;
  material.transparent = true;
  material.alphaTest = 0.5;
  material.depthTest = true;
  title = new THREE.Mesh(
    new THREE.PlaneGeometry(textureFiles.title.texture.image.width, textureFiles.title.texture.image.height),
    material
    );
  title.scale.x = title.scale.y = 0.8;
  title.position.y = 80;
  scene.add(title);

  /// 背景パーティクル表示
  if (!spaceField) {
    var geometry = new THREE.Geometry();

    geometry.endy = [];
    for (var i = 0; i < 250; ++i) {
      var color = new THREE.Color();
      var z = -1000.0 * Math.random() - 100.0;
      color.setHSL(0.05 + Math.random() * 0.05, 1.0, (-1100 - z) / -1100);
      var endy = VIRTUAL_HEIGHT / 2 - z * CONSOLE_HEIGHT / CONSOLE_WIDTH;
      var vert2 = new THREE.Vector3((VIRTUAL_WIDTH - z * 2) * Math.random() - ((VIRTUAL_WIDTH - z * 2) / 2)
        , endy * 2 * Math.random() - endy, z);
      geometry.vertices.push(vert2);
      geometry.endy.push(endy);

      geometry.colors.push(color);
    }

    // マテリアルを作成
    //var texture = THREE.ImageUtils.loadTexture('images/particle1.png');
    var material = new THREE.ParticleBasicMaterial({
      size: 4, blending: THREE.AdditiveBlending,
      transparent: true, vertexColors: true, depthTest: true//, map: texture
    });

    spaceField = new THREE.ParticleSystem(geometry, material);
    spaceField.position = new THREE.Vector3(0.0, 0.0, 0.0);
    scene.add(spaceField);
    tasks.pushTask(moveSpaceField);
  }

  /// テキスト表示
    textPlane.print(3, 25, "Push z key to Start Game", new TextAttribute(true));
    gameTimer.start();
    showTitle.endTime = gameTimer.elapsedTime + 10/*秒*/;
    tasks.setNextTask(taskIndex, showTitle);
}

/// 宇宙空間の表示
function moveSpaceField(taskIndex)
{
  var verts = spaceField.geometry.vertices;
  var endys = spaceField.geometry.endy;
  for (var i = 0, end = verts.length; i < end; ++i) {
    verts[i].y -= 4;
    if (verts[i].y < -endys[i]) {
      verts[i].y = endys[i];
    }
  }
  spaceField.geometry.verticesNeedUpdate = true;
}

/// タイトル表示
function showTitle(taskIndex) {
  gameTimer.update();

  if (basicInput.keyCheck.z) {
    scene.remove(title);
    tasks.setNextTask(taskIndex, initHandleName);
  }
  if (showTitle.endTime < gameTimer.elapsedTime) {
    scene.remove(title);
    tasks.setNextTask(taskIndex, initTop10);
  }

}

var editHandleName = null;
/// ハンドルネームのエントリ前初期化
function initHandleName(taskIndex)
{
  if (editHandleName != null) {
    tasks.setNextTask(taskIndex,gameInit);
  } else {
    editHandleName = handleName || '';
    textPlane.cls();
    textPlane.print(4, 18, 'Input your handle name.');
    textPlane.print(8, 19, '(Max 8 Char)');
    textPlane.print(10, 21, editHandleName);
    //    textPlane.print(10, 21, handleName[0], TextAttribute(true));
    basicInput.unbind();
    var elm = $('<input>');
    elm
      .attr('type', 'text')
      .attr('pattern', '[a-zA-Z0-9_\@\#\$\-]{0,8}')
      .attr('maxlength', 8)
      .attr('id','input-area')
      .val(editHandleName)
      .focusout(function (e) {
        var obj = $(this);
        e.preventDefault();
        e.stopImmediatePropagation();
        setTimeout(function () { obj.focus();}, 10);
        return false;
      })
      .keyup(function (e) {
        if (e.which == 13) {
          editHandleName = this.value;
          var s = this.selectionStart;
          var e = this.selectionEnd;
          textPlane.print(10, 21, editHandleName);
          textPlane.print(10 + s, 21, '_', TextAttribute(true));
          $(this).unbind('keyup');
          basicInput.bind();
          tasks.setNextTask(taskIndex, gameInit);
          storage.setItem('handleName', editHandleName);
          $('#input-area').remove();
          return false;
        }
        editHandleName = this.value;
        var s = this.selectionStart;
        textPlane.print(10, 21, '           ');
        textPlane.print(10, 21, editHandleName);
        textPlane.print(10 + s, 21,'_', new TextAttribute(true));
      })
    .appendTo('#content')
/*    .change(function () {
      editHandleName = this.value;
      var s = this.selectionStart;
      var e = this.selectionEnd;
      textPlane.print(10, 21, editHandleName);
      textPlane.print(10 + s, 21, '_', TextAttribute(true));
      $(this).unbind('keyup');
      $(document).keydown(function (e) { return basicInput.keydown(e); });
      $(document).keyup(function (e) { return basicInput.keyup(e); });
      tasks.setNextTask(taskIndex, gameInit);
      storage.setItem('handleName',editHandleName);
      $('#input-area').remove();
      return true;
    })*/
    .focus();
    tasks.setNextTask(taskIndex, inputHandleName);
  }
}

/// ハンドルネームのエントリ
function inputHandleName(taskIndex)
{

}

/// スコア加算
function addScore(s) {
  score += s;
  if (score > highScore) {
    highScore = score;
  }
}
/// スコア表示
function printScore()
{
  var s = '00000000' + score.toString();
  s = s.substr(s.length - 8, 8);

  textPlane.print(1, 1, s);

  var h = '00000000' + highScore.toString();
  h = h.substr(h.length - 8, 8);
  textPlane.print(12, 1, h);

}

/// ハイスコア表示

/// ゲームの初期化
function gameInit(taskIndex) {

  // オーディオの開始
  audio.start();
  sequencer.load(seqData);
  sequencer.start();
  stage.reset();
  textPlane.cls();

  enemies.reset();

  // 自機の初期化
  myShip = new MyShip(0, -100, 0.1);
  gameTimer.start();
  score = 0;
  textPlane.print(2, 0, 'Score    High Score');
  textPlane.print(20, 39, 'Rest:   ' + myShip.rest);
  printScore();
  tasks.setNextTask(taskIndex, stageInit/*gameAction*/);
}

/// ステージの初期化
function stageInit(taskIndex) {
  textPlane.print(0, 39, 'Stage:' + stage.no);
  gameTimer.start();
  enemies.reset();
  enemies.start();
  enemies.calcEnemiesCount(stage.privateNo);
  enemies.hitEnemiesCount = 0;
  textPlane.print(8, 15, 'Stage ' + (stage.no) + ' Start !!', new TextAttribute(true));
  stageStart.endTime = gameTimer.elapsedTime + 2;
  tasks.setNextTask(taskIndex, stageStart/*gameAction*/);
}

/// ステージ開始
function stageStart(taskIndex)
{
  gameTimer.update();
  myShip.action();
  if (stageStart.endTime < gameTimer.elapsedTime) {
    textPlane.print(8, 15, '                  ', new TextAttribute(true));
    tasks.setNextTask(taskIndex, gameAction,5000);
  }
}

/// 自機の動きを制御する
function gameAction(taskIndex) {
  printScore();
  myShip.action();
  gameTimer.update();
  //console.log(gameTimer.elapsedTime);
  enemies.move();

  if (!processCollision()) {
    if (enemies.hitEnemiesCount == enemies.totalEnemiesCount) {
      printScore();
      stage.advance();
      tasks.setNextTask(taskIndex, stageInit);
    }
  } else {
    myShipBomb.endTime = gameTimer.elapsedTime + 3;
    tasks.setNextTask(taskIndex, myShipBomb);
  };

}

/// 当たり判定
function processCollision(taskIndex)
{
  //　自機弾と敵とのあたり判定
  var myBullets = myShip.myBullets;
  ens = enemies.enemies;
  for (var i = 0, end = myBullets.length; i < end; ++i) {
    var myb = myBullets[i];
    if (myb.enable_) {
      var mybco = myBullets[i].collisionArea;
      var left = mybco.left + myb.x;
      var right = mybco.right + myb.x;
      var top = mybco.top + myb.y;
      var bottom = mybco.bottom - myb.speed + myb.y;
      for (var j = 0, endj = ens.length; j < endj; ++j) {
        var en = ens[j];
        if (en.enable_) {
          var enco = en.collisionArea;
          if (top > (en.y + enco.bottom) &&
              (en.y + enco.top) > bottom &&
            left < (en.x + enco.right) &&
            (en.x + enco.left) < right
            ) {
            myb.enable_ = false;
            en.hit();
            break;
          }
        }
      }
    }
  }

  // 敵と自機とのあたり判定
  if(CHECK_COLLISION){
    var myco = myShip.collisionArea;
    var left = myShip.x + myco.left;
    var right = myco.right + myShip.x;
    var top = myco.top + myShip.y;
    var bottom = myco.bottom + myShip.y;

    for (var i = 0, end = ens.length; i < end; ++i) {
      var en = ens[i];
      if (en.enable_) {
        var enco = en.collisionArea;
        if (top > (en.y + enco.bottom) &&
            (en.y + enco.top) > bottom &&
          left < (en.x + enco.right) &&
          (en.x + enco.left) < right
          ) {
          en.hit();
          myShip.hit();
          return true;
        }
      }
    }
    // 敵弾と自機とのあたり判定
    enbs = enemyBullets.enemyBullets;
    for (var i = 0, end = enbs.length; i < end; ++i) {
      var en = enbs[i];
      if (en.enable) {
        var enco = en.collisionArea;
        if (top > (en.y + enco.bottom) &&
            (en.y + enco.top) > bottom &&
          left < (en.x + enco.right) &&
          (en.x + enco.left) < right
          ) {
          en.hit();
          myShip.hit();
          return true;
        }
      }
    }
    
  }
  return false;
}

/// 自機爆発 
function myShipBomb(taskIndex) {
  gameTimer.update();
  enemies.move();
  if (gameTimer.elapsedTime > myShipBomb.endTime) {
    myShip.rest--;
    if (myShip.rest == 0) {
      textPlane.print(10, 18, 'GAME OVER', new TextAttribute(true));
      printScore();
      textPlane.print(20, 39, 'Rest:   ' + myShip.rest);
      comm.socket.on('sendRank', checkRankIn);
      comm.sendScore(new ScoreEntry(editHandleName,score));
      gameOver.endTime = gameTimer.elapsedTime + 5;
      rank = -1;
      tasks.setNextTask(taskIndex, gameOver);
    } else {
      myShip.mesh.visible = true;
      textPlane.print(20, 39, 'Rest:   ' + myShip.rest);
      textPlane.print(8, 15, 'Stage ' + (stage.no) + ' Start !!', new TextAttribute(true));
      stageStart.endTime = gameTimer.elapsedTime + 2;
      tasks.setNextTask(taskIndex, stageStart/*gameAction*/);
    }
  }

}

/// ゲームオーバー
function gameOver(taskIndex)
{
  gameTimer.update();
  if (gameOver.endTime < gameTimer.elapsedTime) {
    textPlane.cls();
    enemies.reset();
    enemyBullets.reset();
    if (rank >= 0) {
      tasks.setNextTask(taskIndex, initTop10);
    } else {
      tasks.setNextTask(taskIndex, initTitle);
    }
  }
}

/// ランキングしたかどうかのチェック
function checkRankIn(data)
{
  rank = data.rank;
}


/// ハイスコアエントリの表示
function printTop10()
{
  var rankname = [' 1st', ' 2nd', ' 3rd', ' 4th', ' 5th', ' 6th', ' 7th', ' 8th', ' 9th', '10th'];
  textPlane.print(8, 4, 'Top 10 Score');
  var y = 8;
  for (var i = 0, end = highScores.length; i < end; ++i) {
    var scoreStr = '00000000' + highScores[i].score;
    scoreStr = scoreStr.substr(scoreStr.length - 8, 8);
    if (rank == i) {
      textPlane.print(3, y, rankname[i] + ' ' + scoreStr + ' ' + highScores[i].name, new TextAttribute(true));
    } else {
      textPlane.print(3, y, rankname[i] + ' ' + scoreStr + ' ' + highScores[i].name);
    }
    y += 2;
  }
}

function initTop10(taskIndex) {
  textPlane.cls();
  printTop10();
  showTop10.endTime = gameTimer.elapsedTime + 5;
  tasks.setNextTask(taskIndex, showTop10);
}

function showTop10(taskIndex) {
  gameTimer.update();
  if (showTop10.endTime < gameTimer.elapsedTime || basicInput.keyBuffer.length > 0) {
    basicInput.keyBuffer.length = 0;
    textPlane.cls();
    tasks.setNextTask(taskIndex, initTitle);
  }
}
