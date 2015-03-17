module.exports = function(grunt) {
  //Gruntの設定
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    generate: {
      dest: './index.html',
      src: './template.html'
    },
    nodewebkit: {
      options: {
        platforms: ['win', 'osx'],
        buildDir: './bin',
        src: ['./index.html']
      }
    },
    watch: {
      html :{
        files: ['./template.html'],
        tasks: ['generate'],
        options: {
          spawn : false
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-node-webkit-builder');
  grunt.loadNpmTasks('grunt-contrib-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('build', ['nodewebkit']);
  grunt.registerTask('default',['watch'])
  
  
  //defaultタスクの定義
  grunt.registerTask('generate', 'htmlの生成', function () {
    var https = require('https');
    var fs = require('fs');
    var ect = require('ect');
    var config = grunt.config.data.generate;
    var renderer = ect({ root : './' });
    var now = new Date();
    
    // modelデータはviewModelより自動生成
    var model = fs.readFileSync('./viewModel.json', 'utf8');
    var data = fs.readFileSync('./uidata.json', 'utf8');
    model = JSON.parse(model);
    data = JSON.parse(data);
    console.log(model);
    console.log(data);
    // タブパラメータをmodelと結びつける
    for (var tab in data.tabs) {
      var contentParams = data.tabs[tab].contentParams;
      for (var content in contentParams) {
        contentParams[content].params.value = model[contentParams[content].params.value];
      }
    }
    data.datetime = now.toISOString();
    data.datestr = now.toISOString();
    fs.writeFileSync(config.dest, renderer.render(config.src, data), 'utf8');
  });
};