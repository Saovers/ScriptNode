var ping = require ('ping');
var prompt = require ('prompt');
var SSH2Promise = require ('ssh2-promise');
var shell = require('shelljs');
var colors = require('colors');
var path = require('path'); 
var fs = require('fs');
var ip = require('ip');
//Variable 
var name;
var olddir;
var nameS;
var number =0;
var hashToRevert=0;
const GIT = 'git@github.com:TRIPTYK';
var hash = shell.exec('git log | head -n 1 | cut -c8-47', {silent:true});
var config = require('./config.js');
var sshconfig = {
    host:config.host,
    username:config.user,
    password:'bizz$user'
  }
var ssh = new SSH2Promise(sshconfig);
console.log('Bienvenue dans le script de déploiement d\'application node vos êtes dans le dossier local '.bgGreen + __dirname);
//Fonction qui test si le fichier de configuration existe ou non
/*var existConfig = function(){
    var exists = fs.existsSync('/home/christopher/ScriptNode/config2.js');
    var logger = fs.createWriteStream('/home/christopher/ScriptNode/config2.js', {
        flags: 'a' // 'a' means appending (old data will be preserved)
      })
    console.log('file exists ? ' + exists);
    if (exists == true){
        console.log('Le fichier de configuration existe');
    }
    else {
        console.log('Le fichier n\'existe pas nous allons le créer ensemble');
        prompt.start();
        prompt.get(['rhost'],function (err, result) {
                logger.write('var config = {};\n');
                logger.write('config.host="'+result.rhost+'";\n');
                    prompt.start();
                    prompt.get(['rname'],function (err, result) {
                    logger.write('config.name="'+result.rname+'";\n');
                        prompt.start();
                        prompt.get(['rdb'],function (err, result) {
                        logger.write('config.db="'+result.rdb+'";\n');
                            prompt.start();
                            prompt.get(['ruser'],function (err, result) {
                            logger.write('config.user="'+result.ruser+'";\n');
                            logger.write('module.exports = config;');
                            console.log('Merci de votre collaboration, le fichier de configuration "config.js" est maintenant dans votre répertoire courant');
                                namestart();
                        });
            });
        });
      });
      
    }
}
*/
var isInstalled = function(){
    ssh.exec("dpkg -s git | head -2").then((data,err)=> {
        console.log(data);
        console.log(err);
    }).catch((error) => {
        console.log("Error : " + error);
      });
}

//Fonction namestart qui effectue un ping ur l'ip dans config.js
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

//Début du programme
isInstalled();

var cloneorrevert = function() {
 //Choix du Clone ou du revert
console.log('Souhaitez-vous faire un clone ou un revert? (c ou r)');
prompt.start();
 prompt.get(['res'],function (err, result) {
    if (result.res=="c"){
		console.log('Vous avez choisi le clone');
			testDir();
            
    }       
    else{
        console.log('Vous avez choisi le revert');
        revert();
    }
  });
}

/* -------------------------------------------------------------------------------Partie Revert----------------------------------------------------------------------------------- */
var revert = function(){
    ssh.exec("cd /var/www/"+config.name+" && ls -l | nl").then((data)=> {
        console.log('Choisissez la version a revert en fonction des numéros en début de lignes')
        console.log(data);
        prompt.start();
        prompt.get(['number'], function (err, result) {
            number = result.number;
            rhash();
        });
    }).catch((error) => {
        console.log("Error : " + error);
      });
}

var rhash = function(int){
    ssh.exec("cd /var/www/"+config.name+" && ls -l | head -n "+number+" | tail -n 1 | cut -c42-88").then((rhash)=> {
        console.log('La version suivantes sera revert :'+ rhash);
        hashToRevert = rhash;
        Mongodelete();
    }).catch((error) => {
        console.log("Error : " + error);
      });
}

var Mongodelete = function(){
    ssh.exec('mongo '+config.db+' --eval "db.dropDatabase()"').then(()=> {
        console.log('Ancienne db supprimée');
        Mongocreate();
    }).catch((error) => {
        console.log("Infos : " + error);
        Mongocreate();
      });
}

var Mongocreate = function(){
    console.log('mongorestore --host 127.0.0.1 /var/www/'+config.name+'/'+hashToRevert.replace('\n', '').replace('\r', '')+'/database');
    ssh.exec('mongorestore --host 127.0.0.1 /var/www/'+config.name+'/'+hashToRevert.replace('\n', '').replace('\r', '')+'/database').then(()=> {
        console.log('DB restore');
        pm2Stop();
    }).catch((error) => {
        console.log("Infos : " + error);
        pm2Stop();
      });
}
/*------------------------------------------------------------------------------------Fin partie Revert-----------------------------------------------------------------------------*/
var testDir = function(){
    ssh.exec('mkdir -p /var/www/'+config.name).then((data) => {
     
        console.log(data);
        clone();
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

//Fonction appellée dans RemoveOld, elle crée le dossier qui acceuillera le projet sous ce format : /var/www/NameProject/Hash/DirProject
var crDir = function(){
ssh.exec(' mkdir -p /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')).then(()=> {
        console.log('dossier creer');
        gitclone();
});

}

//fonction appellée  dans crDir, elle permet de cloner le proje dans le dossier /var/www/Name/Hash
var gitclone = function(){
    console.log('sudo git clone ' + GIT+'/'+config.name+ ' /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', ''));
    ssh.exec(' sudo git clone ' + GIT+'/'+config.name+ ' /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')).then(()=> {
        console.log('dossier cloner');
        
        Db();
    }).catch((error) => {
        //console.log("Error : " + error);
            Db();
      });
    
}
     
//fonction appellée dans gitclone, c'est un prompt avec choix demander à l'utilisateur. Si il possède une db on lui demande le nbre de 
//script de maj à transmettre
var Db = function(){
    console.log('Avez vous une base de données?(y or n)');
prompt.start();
 prompt.get(['bd'], function (err, result) {
 if (result.bd=="y"){
demande();
    
}
 else{
    console.log('Non vous en avez pas');
    console.log(ip.address());
    MongoDump();
    
 }
});
}

//fonction appellée dans db, elle fonctionne avec transfert(). Ici on récupère le nom des scripts
var demande = function(){
    console.log('Avez vous des scripts de maj à transmettre?(y or n)');
    prompt.start();
    prompt.get(['res'],function (err, result) {

        if (result.res == "y"){

            prompt.start();
            prompt.get(['name'],function(err,result2){
                console.log(result2.name); 
                nameS=result2.name;
                transfert();
            });      
        }  
        else{
            npm();
            
        }  
 });
}

//fonction appellée dans demande(), elle copie le script de MAJ dans /var/www. A la fin elle rappelle demande()
var transfert = function(){
    console.log(config.user+'@'+config.host+' mongo localhost:27017/'+config.db+' /var/www'+nameS);
    shell.exec('scp -r -p '+process.cwd()+'/'+nameS +' '+ config.user+'@'+config.host+':/var/www/', {silent:true}).stdout;
    ssh.exec( 'mongo localhost:27017/'+config.db+' /var/www/'+nameS).then(()=> {
        console.log('Script transmis et exécuter');
        demande();
    }).catch((error) => {
        console.log("Error : " + error);
      });
    
}

//fonction appellée dans le else de demande (si l'user n'a plus de script à transmettre ) et dans MongoRestore() 
var npm = function(){
    console.log('Installation des modules veuiller patienter'.bgRed);
    ssh.exec('cd /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/test && sudo npm install').then(()=> {
        console.log('Paquet npm installer'.bgGreen);
        pm2Stop();
    }).catch((error) => {
        console.log("Error : " + error);
        pm2Stop();
      });
}

//fonction appellée dans npm() , elle stop tout les processus pm2
var pm2Stop = function(){
    ssh.exec('pm2 stop '+config.name).then(()=> {
        console.log('PM2 stopper'.bgGreen);
        pm2Delete();
    }).catch((error) => {
        console.log('PM2 n\'existe pas encore');
        pm2Start();

      });
}

//fonction appellée dans pm2Stop(), elle supprime le conteneur pm2 portant le nom du projet
var pm2Delete = function(){
    ssh.exec('pm2 delete '+config.name).then(()=> {
        console.log('PM2 supprimer'.bgGreen);
        pm2Start();
    }).catch((error) => {
        console.log('PM2 n\'existe pas encore');
        pm2Start();
      });
}
/* Attention il faut installer : "npm i -g babel-cli" car pm2 à des soucis de compréhension avec node */
//fonction appellée dans pm2Delete, elle démarre le process grâce au fichier app.js situer dans /app
// !!!!! Changer l'endroit du app.js dans l'environnement réel !!!!!!!!
var pm2Start = function(){
    //console.log('pm2 start--interpreter babel-node  /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/test/app/app.js --name='+config.name)
    ssh.exec('pm2 start --interpreter babel-node /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/test/app/app.js --name='+config.name).then(()=> {
        console.log('PM2 Démarrer'.bgGreen);
        process.exit()
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit()
      });
}

//Fonction apellée dans db(), elle dump la db local en reprenant le nom issu du fichier config.js
var MongoDump = function(){
    console.log('sudo mongodump --db '+config.db+' --host '+ip.address()+' --port 27017 --out /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/database');
    ssh.exec('mongodump --db '+config.db+' --host '+ip.address()+' --port 27017 --out /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/database').then(()=> {
        console.log('Mongo Dump effectué');
        MongoRestore();
    }).catch((error) => {
        //console.log("Infos : " + error);
        console.log('Mongo Dump effectué'.bgGreen);
        MongoRestore();
      });
}

//fonction appellée dans MongoDump(), elle va restore la db sur le serveur
var MongoRestore = function(){
    console.log('mongorestore --host 127.0.0.1 /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/database')
    ssh.exec('mongorestore --host 127.0.0.1 /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/database').then(()=> {
        console.log('Mongo Restore effectué');
        npm();
    }).catch((error) => {
        //console.log("Infos : " + error);
        console.log('Mongo Restore effectué'.bgGreen);
        npm();
      });
}


/*ssh.exec('').then(()=> {
        console.log('');
    }).catch((error) => {
        console.log("Error : " + error);
      });
*/