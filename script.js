var ping = require ('ping');
var prompt = require ('prompt');
var SSH2Promise = require ('ssh2-promise');
var shell = require('shelljs');
var colors = require('colors');
var config = require('./config.js');
var path = require('path'); 
var fs = require('fs');

//Variable 
var name;
var olddir;
const GIT = "https://github.com/Saovers"
var hash = shell.exec('git log | head -n 1 | cut -c8-47', {silent:true}).stdout;
var sshconfig = {
    host: '172.16.30.24',
    username: 'serveur',
    password: 'Test123*'
  }
   
  var ssh = new SSH2Promise(sshconfig);
console.log('Bienvenue dans le script de déploiement d\'application node vos êtes dans le dossier '.bgGreen + __dirname);


var namestart = function(){
    var hosts = [config.host];
hosts.forEach(function(host){
    ping.sys.probe(config.host, function(isAlive){
        var msg = isAlive ? 'host ' + config.host + ' is alive' : 'host ' + config.host + ' is dead';
        console.log(msg);
                if (msg =='host ' + config.host + ' is alive'){
                    cloneorrevert();
                }
                else{
                    console.log('stop');
                }

         
    });
});
}


namestart();

var cloneorrevert = function() {
 //Choix du Clone ou du revert
console.log('Souhaitez-vous faire un clone ou un revert? (c ou r)');
prompt.start();
 prompt.get(['res'],function (err, result) {
    if (result.res=="c"){
		console.log('Vous avez choisi le clone');
			clone();
            
    }       
    else{
        console.log('Vous avez choisi le revert');
        console.log(hash);
    }
  });
}

var clone = function(){
	ssh.exec('cd /var/www/'+config.name+  ' && ls -lt | nl | tail -n 1 | cut -c5-6').then((data) => {
     
        console.log("Il y a actuellement : "+ parseInt(data-1) + ' sous dossier');
        if (parseInt(data-1) > 10){
        	Olddirectory();
           
        }
        else{
        	console.log('Dossier OK');
            crDir();
        }
});

}

//Fonction appellée dans clone, elle prend le nom du dossier le plus vieux
var Olddirectory = function(){
	
ssh.exec('cd /var/www/'+config.name+' && ls -tl | tail -n 1 | cut -c42-96').then((olddirl)=> {
        console.log('Le vieux dossier est : '+ olddirl);
        olddir=olddirl;
        RemoveOld();
    
});

}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
var RemoveOld = function(){
console.log(olddir);
ssh.exec(' sudo rm -rd /var/www/'+config.name+'/'+olddir).then(()=> {
        console.log('dossier supprimer');
        crDir();
});
}

var crDir = function(){
    console.log(hash);
ssh.exec(' sudo mkdir -p /var/www/'+config.name+'/'+hash).then(()=> {
        console.log('dossier creer');
        //test();
});
}

var test = function(){
    //console.log('sudo git clone ' + GIT+'/'+config.name+ ' /var/www/'+config.name+'/'+hash+' | git status');
    ssh.exec(' sudo git clone ' + GIT+'/'+config.name+ ' /var/www/'+config.name+'/'+hash).then(()=> {
        console.log('dossier cloner');
        throw new Error('Failed');
        Db();
    });
}
     
var Db = function(){
    console.log('Avez vous une base de données?');
prompt.start();
 prompt.get(['bd'], function (err, result) {
 if (result.bd=="y"){
     console.log('Oui vous en avez une');
 }
 else{
    console.log('Non vous en avez pas');
 }
});
}

