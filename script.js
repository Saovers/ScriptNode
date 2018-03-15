var ping = require ('ping');
var prompt = require ('prompt');
var SSH = require ('simple-ssh');
var shell = require('shelljs');

//Variable 
var name;
var olddir;
const GIT = "https://github.com/Saovers"
var hash = shell.exec('git log | head -n 1 | cut -c8-47', {silent:true}).stdout;
console.log('Bienvenue dans le script de déploiement d\'application node vos êtes dans le dossier' + __dirname);

var namestart = function(){
	console.log('Quel est le nom du projet?');
prompt.start();
 prompt.get(['name'], function (err, result) {
    console.log('Nom du projet: ' + result.name);
    name = result.name;
    console.log('Quel est l\'ip de votre serveur?');
prompt.start();
 
  // 
  // Get two properties from the user: username and email 
  // 
  prompt.get(['host'], function (err, result) {
    // 
    // Log the results. 
    // 
    console.log('  IP: ' + result.host);
    	var hosts = [result.host];
hosts.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead';
        console.log(msg);
         cloneorrevert();
    });
});
  });
  });
}


namestart();

var cloneorrevert = function() {
 //Choix du Clone ou du revert
console.log('Souhaitez-vous faire un clone ou un revert? (c ou r)');
prompt.start();
 prompt.get(['res'],function (err, result) {
    if (res="c"){
		console.log('Vous avez choisi le clone');
			clone();
            
    }       
    else{
    	console.log('Vous avez choisi le revert');
    }
  });
}

var clone = function(){
	var ssh = new SSH({
    host: '172.16.30.33',
    user: 'serveur',
    pass: 'Test123*'
});
	ssh.exec('cd /var/www/'+name+  ' && ls -lt | nl | tail -n 1 | cut -c5-6', {
    out: function(stdout) {
        console.log("Il y a actuellement : "+ parseInt(stdout-1) + ' sous dossier');
        if (parseInt(stdout-1) > 1){
        	Olddirectory();
           
        }
        else{
        	console.log('Dossier OK');
            crDir();
        }
         
    }
}).start();

}

//Fonction appellée dans clone, elle prend le nom du dossier le plus vieux
var Olddirectory = function(){
	var ssh = new SSH({
    host: '172.16.30.33',
    user: 'serveur',
    pass: 'Test123*'
});
ssh.exec('cd /var/www/'+name+' && ls -tl | tail -n 1 | cut -c42-96', {
    out: function(stdout) {
        console.log('Le vieux dossier est : '+ stdout);
        olddir=stdout;
        console.log(olddir);
        RemoveOld();
    }
}).start();

}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
var RemoveOld = function(){
var ssh = new SSH({
    host: '172.16.30.33',
    user: 'serveur',
    pass: 'Test123*'
});
console.log(olddir);
ssh.exec(' sudo rm -rd /var/www/'+name+'/'+olddir, {
    out: function(stdout) {
        console.log('dossier supprimer');
    }
}).start();
 crDir();
}

var crDir = function(){
	var ssh = new SSH({
    host: '172.16.30.33',
    user: 'serveur',
    pass: 'Test123*'
});
ssh.exec(' sudo mkdir -p /var/www/'+name+'/'+hash, {
    out: function(stdout) {
        console.log('dossier creer');
    }
}).start();
ssh.exec(' sudo git clone ' + GIT+'/'+name+ ' /var/www/'+name+'/'+hash+' | git status', {
    out: function(stdout) {
        console.log('dossier cloner');
    }
}).start();

}
     


