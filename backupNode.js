var ping = require('ping');
var prompt = require('prompt-async');
var SSH2Promise = require('ssh2-promise');
var shell = require('shelljs');
var colors = require('colors');
var path = require('path');
var fsP = require('promisify-fs');
var fs = require('fs');
//Variable 
var olddir;
var nameS;
var number = 1;
var hashToRevert = 0;
const GIT = 'git@github.com:TRIPTYK';
var hash = shell.exec('git log | head -n 1 | cut -c8-47', { silent: true });
var Dname = shell.exec('pwd | sed \'s#.*/##\'', { silent: true }).replace('\n', '').replace('\r', '');
let nbrMU = 1;
let config;
let sshconfig;
let ssh;


//Fonction qui test si le fichier de configuration existe ou non
var existConfig = function () {
    var exists = fs.existsSync(process.cwd()+'/config.js');
    var logger = fs.createWriteStream(process.cwd()+'/config.js', {
        flags: 'a' // 'a' means appending (old data will be preserved)
    })
    console.log('file exists ? ' + exists);
    if (exists == true) {
        console.log('Le fichier de configuration existe');

        config = require("./config.js");
        sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
       isInstalled();
    }
    else {
        console.log('Le fichier n\'existe pas nous allons le créer ensemble');
        prompt.start();
        prompt.get(['ipServeur'], function (err, result) {
            logger.write('var config = {};\n');
            logger.write('config.host="' + result.ipServeur + '";\n');
            console.log('Le nom de votre projet est : '+Dname+' (y or n)?');
            prompt.start();
            prompt.get(['rname'], function (err, result) {
                if( result.rname =="y"){
                    logger.write('config.name="' + Dname + '";\n');
                    prompt.start();
                prompt.get(['rdb'], function (err, result) {
                    logger.write('config.db="' + result.rdb + '";\n');
                        prompt.start();
                        prompt.get(['motdepasse'], function (err, result) {
                        logger.write('config.pass="' + result.motdepasse + '";\n');
                            prompt.start();
                            prompt.get(['ruser'], function (err, result) {
                            logger.write('config.user="' + result.ruser + '";\n');
                            logger.write('module.exports = config;');
                        console.log('Merci de votre collaboration, le fichier de configuration "config.js" est maintenant dans votre répertoire courant');
                        config = require("./config.js");
                        sshconfig = {
                            host: config.host,
                            username: config.user,
                            identity: '/home/christopher/.ssh/id_rsa'
                        }
                        ssh = new SSH2Promise(sshconfig);
                        
                    });
                });
            });
                }
                else{
                    console.log('Veuillez inscire le nom du projet');
                    prompt.start();
                prompt.get(['rname2'], function (err, result) {
                    logger.write('config.name="' + result.rname2 + '";\n');
                    prompt.start();
                prompt.get(['rdb'], function (err, result) {
                    logger.write('config.db="' + result.rdb + '";\n');
                        prompt.start();
                        prompt.get(['motdepasse'], function (err, result) {
                        logger.write('config.pass="' + result.motdepasse + '";\n');
                            prompt.start();
                            prompt.get(['ruser'], function (err, result) {
                            logger.write('config.user="' + result.ruser + '";\n');
                            logger.write('module.exports = config;');
                        console.log('Merci de votre collaboration, le fichier de configuration "config.js" est maintenant dans votre répertoire courant');
                        config = require("./config.js");
                        sshconfig = {
                            host: config.host,
                            username: config.user,
                            identity: '/home/christopher/.ssh/id_rsa'
                        }
                        ssh = new SSH2Promise(sshconfig);
                    });
                    
                    });
                });
            });
                }
                
            });
        });

    }
}

let isInstalled = function () {
     ssh.exec("dpkg -s git | head -2 | echo $?").then((data) => {
        
        console.log('Le paquet git est bien installé'.bgGreen);
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit();
    });


     ssh.exec("dpkg -s mongodb-org | head -2 | echo $?").then((data) => {
      
      console.log('Le paquet mongoDB est bien installé'.bgGreen);
      
  }).catch((error) => {
      console.log("Error : " + error);
      process.exit();
  });

   ssh.exec(" pm2 -v | echo $?").then((data) => {
    console.log('Le paquet PM2 est bien installé'.bgGreen);
    namestart();

}).catch((error) => {
    console.log("Error : " + error);
    process.exit();
});
}

//Fonction namestart qui effectue un ping ur l'ip dans config.js
var namestart = function () {
    var hosts = [config.host];
    hosts.forEach(function (host) {
        ping.sys.probe(config.host, function (isAlive) {
            var msg = isAlive ? 'host ' + config.host + ' is alive' : 'host ' + config.host + ' is dead';
            console.log(msg);
            if (msg == 'host ' + config.host + ' is alive') {

                cloneorrevert();
            }
            else {
                console.log('stop');
            }


        });
    });
}

//Début du programme
existConfig();

var cloneorrevert = function () {
    //Choix du Clone ou du revert
    console.log('Souhaitez-vous faire un clone ou un revert? (c ou r)');
    prompt.start();
    prompt.get(['res'], function (err, result) {
        if (result.res == "c") {
            console.log('Vous avez choisi le clone');
            testDir();

        }
        else {
            console.log('Vous avez choisi le revert');
            revert();
        }
    });
}

/* -------------------------------------------------------------------------------Partie Revert----------------------------------------------------------------------------------- */
var revert = function () {
    ssh.exec("cd /var/www/" + config.name + " && ls -l | nl").then((data) => {
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

var rhash = function (int) {
    ssh.exec("cd /var/www/" + config.name + " && ls -l | head -n " + number + " | tail -n 1 | cut -c42-88").then((rhash) => {
        console.log('La version suivantes sera revert :' + rhash);
        hashToRevert = rhash;
        if (config.db == "") {

            pm2Stop();
        }
        else {
            Mongodelete();
        }
    }).catch((error) => {
        console.log("Error : " + error);
    });
}

var Mongodelete = function () {
    ssh.exec('mongo ' + config.db + ' --eval "db.dropDatabase()"').then(() => {
        console.log('Ancienne db supprimée');
        Mongocreate();
    }).catch((error) => {
        console.log("Infos : " + error);
        Mongocreate();
    });
}

var Mongocreate = function () {
    console.log('mongorestore --host 127.0.0.1 /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/database/'+config.db);
    ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/database/'+config.db).then(() => {
        console.log('DB restore');
        pm2Stop();
    }).catch((error) => {
        console.log("DB restore");
        pm2Stop();
    });
}
/*------------------------------------------------------------------------------------Fin partie Revert-----------------------------------------------------------------------------*/
var testDir = function () {
    ssh.exec('mkdir -p /var/www/' + config.name).then((data) => {

        console.log(data);
        clone();
    }).catch((error) => {
        console.log("Infos : " + error);

    });
}

var clone = function () {
    ssh.exec('cd /var/www/' + config.name + ' && ls -lt | nl | tail -n 1 | cut -c5-6').then((data) => {

        console.log("Il y a actuellement : " + parseInt(data - 1) + ' sous dossier');
        if (parseInt(data - 1) > 10) {
            Olddirectory();

        }
        else {
            console.log('Dossier OK');
            crDir();
        }
    });

}

//Fonction appelée dans clone, elle prend le nom du dossier le plus vieux
var Olddirectory = function () {

    ssh.exec('cd /var/www/' + config.name + ' && ls -tl | tail -n 1 | cut -c42-96').then((olddirl) => {
        console.log('Le vieux dossier est : ' + olddirl);
        olddir = olddirl;
        RemoveOld();

    }).catch((error) => {
        console.log("Error : " + error);
    });

}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
var RemoveOld = function () {
    if (olddir==""){
        console.log('La variable olddir est vide, attention cela risque de supprimer tous vos dossiers, vérifier dans le code le soucis');
        crDir();
    }
    else{
        console.log(olddir);
        ssh.exec(' rm -rd /var/www/' + config.name + '/' + olddir).then(() => {
            console.log('dossier supprimer');
            crDir();
        }).catch((error) => {
            console.log("Error : " + error);
        });
    }
   
}

//Fonction appelée dans RemoveOld, elle crée le dossier qui acceuillera le projet sous ce format : /var/www/NameProject/Hash/DirProject
var crDir = function () {
    ssh.exec(' mkdir -p /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '')).then(() => {
        console.log('dossier creer');
        gitclone();
    }).catch((error) => {
        console.log("Error : " + error);
    });

}

//fonction appelée  dans crDir, elle permet de cloner le proje dans le dossier /var/www/Name/Hash
var gitclone = function () {
    ssh.exec(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '')).then(() => {
        console.log('dossier cloner');
        if (config.db == "") {
            npm();
        }
        else {
            Db();
        }

    }).catch((error) => {
        console.log('Projet déjà cloner');
        //console.log("Error : " + error);
        if (config.db == "") {
            console.log('Pas de base de donnée, passage directement à l\'installation NPM');
            npm();
        }
        else {
            console.log('Vous avez une DB passage à l\'etape suivante');
            Db();
        }
    });

}

//fonction appelée dans gitclone, c'est un prompt avec choix demander à l'utilisateur. Si il possède une db on lui demande le nbre de 
//script de maj à transmettre
var Db = function () {
    console.log('Avez vous une base de données déjà présente sur le serveur de destination?(y or n)');
    prompt.start();
    prompt.get(['bd'], function (err, result) {
        if (result.bd == "y") {
            copieMongoUpdate();

        }
        else {
            console.log('Non vous en avez pas');
            MongoDump();

        }
    });
}

//Copie du dossier mongoUpdate dans le répertoire sur le serveur 
var copieMongoUpdate = function () {
    shell.exec('scp -r -p ' + process.cwd() + '/mongoUpdate ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''), { silent: true });
    countMongoUpdate();
}

//fonction qui va compter combien de script de MAJ il y a dans mongoUpdate
let countMongoUpdate = function () {
    ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate && ls -l . | egrep -c \'^-\'').then((data) => {
        console.log('Le nombre de script de MAJ mongo est de ' + data);
        nbreMU = data;
        recupName();
    }).catch((error) => {
        console.log("Error : " + error);
    });
}

//Fonction qui travail avec recupName, lorsque le nom est récupéré, il est transmis à cette fonction qui va exécuter le script
var transfert = function () {
    //console.log('mongo localhost:27017/' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate/' + nameS);
    
        ssh.exec('mongo localhost:27017/' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate/' + nameS).then((data) => {
            console.log('Script transmis et exécuter');
            number++;
            recupName();
        }).catch((error) => {
            console.log("Error : " + error);
        });
}

//Fonction appelée dans transfert(), elle récupère le nom des scripts dans mongoUpdate 
var recupName = function () {
    if (number>nbreMU){
        npm();
    }
    if (number <= nbreMU) {
    ssh.exec('find /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate -maxdepth 1 -type f -printf \'%f\\n\' | awk FNR=='+number+'').then((data) => {
        console.log('le nom du script ' + data);
        nameS = data;
        transfert();
    }).catch((error) => {
        console.log("Error : " + error);
    });
}
}

//fonction appelée à la fin de mongoRestore (si l'utilisateur n'a pas de DB mais qu'il souhaite en ajouter une) , à la fin de recupName (si l'utilisateur souhaite transmettre des scripts de MAJ) et si l'utilisateur n'a rensigné aucune DB elle est appelée à la fin de gitclone
var npm = function () {
    console.log('Installation des modules veuiller patienter'.bgRed);
    ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/ && npm install').then(() => {
        console.log('Paquet npm installer'.bgGreen);
        pm2Stop();
    }).catch((error) => {
        console.log('Les modules nodes sont déjà installer');
        pm2Stop();
    });
}

//fonction appelée dans npm() , elle stop tout les processus pm2
var pm2Stop = function () {
    ssh.exec('pm2 stop ' + config.name).then(() => {
        console.log('PM2 stopper'.bgGreen);
        pm2Delete();
    }).catch((error) => {
        console.log('PM2 n\'existe pas encore');
        pm2Start();

    });
}

//fonction appelée dans pm2Stop(), elle supprime le conteneur pm2 portant le nom du projet
var pm2Delete = function () {
    ssh.exec('pm2 delete ' + config.name).then(() => {
        console.log('PM2 supprimer'.bgGreen);
        pm2Start();
    }).catch((error) => {
        console.log('PM2 n\'existe pas encore');
        pm2Start();
    });
}
/* Attention il faut installer : "npm i -g babel-cli" car pm2 à des soucis de compréhension avec node */
//fonction appelée dans pm2Delete, elle démarre le process grâce au fichier app.js situer dans /app
var pm2Start = function () {
    //console.log('pm2 start--interpreter babel-node  /var/www/'+config.name+'/'+hash.replace('\n', '').replace('\r', '')+'/test/app/app.js --name='+config.name)
    ssh.exec('pm2 start /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/app.js --name=' + config.name).then(() => {
        console.log('PM2 Démarrer'.bgGreen);
        process.exit()
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit()
    });
}

//Fonction apellée dans db(), elle dump la db local en reprenant le nom issu du fichier config.js
var MongoDump = function () {
   
    shell.exec('mongodump --db ' + config.db + ' -o /tmp', { silent: true });
    ssh.exec('mkdir /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database').then(() => {
        console.log('Dossier database créer');
        shell.exec('scp -r -p /tmp/' + config.db + ' ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database', { silent: true });
        MongoRestore();
    }).catch((error) => {
        //console.log("Infos : " + error);
        console.log('Le dossier database existe déjà');
        shell.exec('scp -r -p /tmp/' + config.db + ' ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database', { silent: true });
        MongoRestore();
    });
}

//fonction appelée dans MongoDump(), elle va restore la db sur le serveur
var MongoRestore = function () {
    
    ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/'+config.db).then(() => {
        console.log('Mongo Restore effectué');
        shell.exec('rm -rf /tmp/' + config.db, { silent: true });
        npm();
    }).catch((error) => {
        //console.log("Infos : " + error);
        shell.exec('rm -rf /tmp/' + config.db, { silent: true });
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