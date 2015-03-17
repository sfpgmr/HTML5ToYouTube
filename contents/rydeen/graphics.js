/// <reference path="graphics.js" />
/// <reference path="https://cdnjs.cloudflare.com/ajax/libs/three.js/r70/three.js" />

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("graphics", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeG = definition;
        }

    // <script>
    } else if (typeof self !== "undefined") {
        self.graphics = definition();
    } else {
        window.graphics = definition();
    }
})
(function () {
  var q = Q;
  var textureLength = 0;
  var textureCount = 0;
  var textureFiles = new Array(0);
  
  function TextureFile(src, parent) {
    this.defer = q.defer();
    this.src = src;
    this.parent = parent;
    this.loadComplete = false;
    this.loadError = false;
    var self = this;
    this.texture = THREE.ImageUtils.loadTexture(this.src, {},
    function (texture) {
      
      self.loadComplete = true;
      if (self.src.match(/\.png/i)) {
        self.texture.premultiplyAlpha = true;
      }
//      self.parent.loadCompletedCount++;
      self.parent.totalTextureCount++;
      self.defer.resolve();
    }
      ,
      function () {
      self.loadError = true;
      self.defer.reject();
    }
    );
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearMipMapLinearFilter;
    this.parent.promises.push(this.defer.promise);
    return this;
  }
  
  /// テクスチャーとしてcanvasを使う場合のヘルパー
  function CanvasTexture(width, height) {

    this.canvas = document.createElement('canvas'); 
    this.canvas.width = width ;
    this.canvas.height = height ;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.Texture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearMipMapLinearFilter;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.geometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.z = 0.001;
    // スムージングを切る
    this.ctx.msImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
  }
  
  /// プログレスバー表示クラス
  function Progress() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = VIRTUAL_WIDTH;
    this.canvas.height = 160;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.Texture(this.canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearMipMapLinearFilter;
    // スムージングを切る
    this.ctx.msImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
    this.geometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  //this.texture.premultiplyAlpha = true;
  }
  
  /// プログレスバーを表示する。
  Progress.prototype.render = function (message, percent) {
    var ctx = this.ctx;
    var width = this.canvas.width, height = this.canvas.height;
    //      ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var textWidth = ctx.measureText(message).width;
    ctx.strokeStyle = ctx.fillStyle = 'rgba(255,255,255,1.0)';
    
    ctx.fillText(message, (width - textWidth) / 2, 100);
    ctx.beginPath();
    ctx.rect(20, 75, width - 20 * 2, 10);
    ctx.stroke();
    ctx.fillRect(20, 75, (width - 20 * 2) * percent / 100, 10);
    this.texture.needsUpdate = true;
  }
  
  /// imgからジオメトリを作成する
  function createGeometryFromImage(image) {
    var canvas = document.createElement('canvas');
    var w = textureFiles.author.texture.image.width;
    var h = textureFiles.author.texture.image.height;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var data = ctx.getImageData(0, 0, w, h);
    var geometry = new THREE.Geometry();
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
            var vert = new THREE.Vector3(((x - w / 2.0)) * 2.0, ((y - h / 2)) * -2.0, 0.0);
            geometry.vertices.push(vert);
            geometry.colors.push(color);
          }
        }
      }
    }
  }
  
  function createSpriteGeometry(size) {
    var geometry = new THREE.Geometry();
    var sizeHalf = size / 2;
    // geometry.
    geometry.vertices.push(new THREE.Vector3(-sizeHalf, sizeHalf, 0));
    geometry.vertices.push(new THREE.Vector3(sizeHalf, sizeHalf, 0));
    geometry.vertices.push(new THREE.Vector3(sizeHalf, -sizeHalf, 0));
    geometry.vertices.push(new THREE.Vector3(-sizeHalf, -sizeHalf, 0));
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

  var m = {
    TextureFile: TextureFile,
    CanvasTexture: CanvasTexture,
    Progress: Progress,
    createGeometryFromImage: createGeometryFromImage,
    createSpriteGeometry: createSpriteGeometry,
    createSpriteUV: createSpriteUV,
    updateSpriteUV: updateSpriteUV,
    createSpriteMaterial: createSpriteMaterial
  }

  return m;
});




