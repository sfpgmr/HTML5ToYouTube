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

/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/d3/3.5.2/d3.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/three.js/r70/three.js" />
/// <reference path="..\intellisense\q.intellisense.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/d3/3.5.2/d3.js" />
/// <reference path="http://cdnjs.cloudflare.com/ajax/libs/three.js/r70/three.js" />
/// <reference path="./q.intellisense.js" />
/// <reference path="./graphics.js" />
"use strict"

window.addEventListener('load',function(){
var fs = require('fs');
var gui = require('nw.gui');

const WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
var renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0x000000, 1);
renderer.domElement.id = 'console';
renderer.domElement.className = 'console';
renderer.domElement.style.zIndex = 0;

d3.select('#content').node().appendChild(renderer.domElement);

renderer.clear();
// シーンの作成
var scene = new THREE.Scene();

// カメラの作成
var camera = new THREE.PerspectiveCamera(90.0, WIDTH / HEIGHT);
camera.position.x = 0.0;
camera.position.y = 0.0;
camera.position.z = (WIDTH / 2.0) * HEIGHT / WIDTH;
camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

// テクスチャー定義
var textureFiles = {
  totalTextureCount: 0,
  promises: [],
  textures: {}
};

  function createSpriteGeometry(width,height) {
    var geometry = new THREE.Geometry();
    var sizeHalfX = width / 2;
    var sizeHalfY = height / 2;
    // geometry.
    geometry.vertices.push(new THREE.Vector3(-sizeHalfX, sizeHalfY, 0));
    geometry.vertices.push(new THREE.Vector3(sizeHalfX, sizeHalfY, 0));
    geometry.vertices.push(new THREE.Vector3(sizeHalfX, -sizeHalfY, 0));
    geometry.vertices.push(new THREE.Vector3(-sizeHalfX, -sizeHalfY, 0));
    geometry.faces.push(new THREE.Face3(0, 2, 1));
    geometry.faces.push(new THREE.Face3(0, 3, 2));
    return geometry;
  }
  
  /// テクスチャー上の指定スプライトのUV座標を求める
  function createSpriteUV(geometry, texture, cellWidth, cellHeight, cellNo) {
    var width = texture.image.width;
    var height = texture.image.height;
    
    var uCellCount = (width / cellWidth) | 0;
    var vCellCount = (height / cellHeight) | 0;
    var vPos = vCellCount - ((cellNo / uCellCount) | 0);
    var uPos = cellNo % uCellCount;
    var uUnit = cellWidth / width;
    var vUnit = cellHeight / height;
    
    geometry.faceVertexUvs[0].push([
      new THREE.Vector2((uPos) * cellWidth / width, (vPos) * cellHeight / height),
      new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos - 1) * cellHeight / height),
      new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos) * cellHeight / height)
    ]);
    geometry.faceVertexUvs[0].push([
      new THREE.Vector2((uPos) * cellWidth / width, (vPos) * cellHeight / height),
      new THREE.Vector2((uPos) * cellWidth / width, (vPos - 1) * cellHeight / height),
      new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos - 1) * cellHeight / height)
    ]);
  }
  
  function updateSpriteUV(geometry, texture, cellWidth, cellHeight, cellNo) {
    var width = texture.image.width;
    var height = texture.image.height;
    
    var uCellCount = (width / cellWidth) | 0;
    var vCellCount = (height / cellHeight) | 0;
    var vPos = vCellCount - ((cellNo / uCellCount) | 0);
    var uPos = cellNo % uCellCount;
    var uUnit = cellWidth / width;
    var vUnit = cellHeight / height;
    var uvs = geometry.faceVertexUvs[0][0];
    
    uvs[0].x = (uPos) * uUnit;
    uvs[0].y = (vPos) * vUnit;
    uvs[1].x = (uPos + 1) * uUnit;
    uvs[1].y = (vPos - 1) * vUnit;
    uvs[2].x = (uPos + 1) * uUnit;
    uvs[2].y = (vPos) * vUnit;
    
    uvs = geometry.faceVertexUvs[0][1];
    
    uvs[0].x = (uPos) * uUnit;
    uvs[0].y = (vPos) * vUnit;
    uvs[1].x = (uPos) * uUnit;
    uvs[1].y = (vPos - 1) * vUnit;
    uvs[2].x = (uPos + 1) * uUnit;
    uvs[2].y = (vPos - 1) * vUnit;
    
    
    geometry.uvsNeedUpdate = true;

  }
  
  function createSpriteMaterial(texture) {
    // メッシュの作成・表示 ///
    var material = new THREE.MeshBasicMaterial({ map: texture /*,depthTest:true*/, transparent: true });
    material.shading = THREE.FlatShading;
    material.side = THREE.FrontSide;
    material.alphaTest = 0.5;
    material.needsUpdate = true;
    //  material.
    return material;
  }

function loadTexture(info) {
  var defer = Q.defer();
  THREE.ImageUtils.loadTexture(info.path, {},
  function (texture) {
    info.texture = texture;
    if (info.path.match(/\.png/i)) {
      texture.premultiplyAlpha = true;
    }
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    defer.resolve(info);
    },// Error
    function (e) {
    defer.reject(e);
  });
  return defer.promise;
}

var textureInfos = [
  { name:'horse' ,path: './The_Horse_in_Motion.jpg'},
  { name:'horse01',path:'./The_Horse_in_Motion01.jpg'}
];

var parent = null;

window.addEventListener('message', 
  function(event){
    parent = event.src;
  }
  , false);

var renderToFile;
var preview;

  Q.all(
  textureInfos.map(function (info){
    return loadTexture(info);
  }))
  .then(
    function (array){
      var textures = {};
      array.forEach(function(info){
        textures[info.name] = info.texture;
      });
      var preview = window.location.search.match(/preview/ig);

      // 馬の絵 
      var horseMaterial = new THREE.MeshBasicMaterial({ map: textures.horse });
      horseMaterial.shading = THREE.FlatShading;
      //material.antialias = false;
      horseMaterial.transparent = true;
      horseMaterial.alphaTest = 0.5;
      horseMaterial.depthTest = true;
      var horseMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(textures.horse.image.width, textures.horse.image.height),
        horseMaterial
      );
      horseMesh.scale.x = 1.0;
      horseMesh.scale.y = 1.0;
      horseMesh.position.y = 0.0;
      scene.add(horseMesh);

      // 馬スプライト
      var horseSprites = [];
      var spriteWidth = textures.horse01.image.width / 4;
      var spriteHeight = textures.horse01.image.height / 3;

      var horseSpriteMaterial = createSpriteMaterial(textures.horse01);

      for(var y = 0;y < 3;++y){
        for(var x = 0;x < 4;++x){
          var horseGeometry = createSpriteGeometry(spriteWidth,spriteHeight);
          createSpriteUV(horseGeometry,textures.horse01,spriteWidth,spriteHeight,0);
          var horseSpriteMesh = new THREE.Mesh(horseGeometry,horseSpriteMaterial);
          horseSpriteMesh.position.x = 10.0 + x * spriteWidth + spriteWidth / 2 - WIDTH / 2;
          horseSpriteMesh.position.y = 5.0 + (-y) * spriteHeight - spriteHeight / 2 + HEIGHT / 2;
          horseSprites.push(horseSpriteMesh);
          scene.add(horseSpriteMesh);
        }
      }
      var index = 0;
      var horseAnimSpeed = (60.0 / (143.0 * 11.0));
      var time = 0.0;
      var frameNo = 0;
      var endTime = 60.0 * 4.0 + 35.0;
      var frameSpeed = 1.0 / 30.0; 
      var delta = frameSpeed;
      var previewCount = 0;
      function renderToFile(preview){
        if(preview){
          // プレビュー
          previewCount++;
          if((previewCount & 1) == 0) {
            requestAnimationFrame(renderToFile.bind(renderToFile,true));
            return;
          }
        }
        delta -= horseAnimSpeed;
        if(delta < 0){
          delta += frameSpeed;
          ++index;
          if(index > 10){index = 0;}
        }
        time += frameSpeed;
        if(time > endTime) {
          if(parent){
            parent.postMessage("end");
          }
          window.close();
          return;
        }
        ++frameNo;
        var no = index;
        for(var i = 0;i < 12;++i){
          ++no;
          if(no > 10) no = 0;
          updateSpriteUV(horseSprites[i].geometry,textures.horse01,spriteWidth,spriteHeight,no);
        }
        renderer.render(scene,camera);
        if(!preview){
          // canvasのtoDataURLを使用した実装
          //var data = d3.select('#console').node().toDataURL('image/jpeg'); // jpegは動作せず
          var data = d3.select('#console').node().toDataURL('image/png');
          data = data.substr(data.indexOf(',') + 1);
          var buffer = new Buffer(data, 'base64');
          Q.nfcall(fs.writeFile,'./temp/out' + ('000000' + frameNo.toString(10)).slice(-6) + '.png',buffer,'binary')
          .then(renderToFile);
          // Window.capturePage()を使用した実装
        //gui.Window.get().capturePage(function(data){
        //  Q.nfcall(fs.writeFile,'./temp/out' + ('000000' + frameNo.toString(10)).slice(-6) + '.png',data,'binary')
        //  .then(renderToFile);
        //},{format:'png',datatype:'buffer'});
        } else {
          // プレビュー
          requestAnimationFrame(renderToFile.bind(renderToFile,true));
        }
      }
      renderToFile(preview);
    }
  ).catch(
    function (e){
      alert(e.stack);
    }
  );
});

