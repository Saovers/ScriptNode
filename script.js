var ping = require ('ping');
var prompt = require ('prompt-async');
var SSH2Promise = require ('ssh2-promise');
var shell = require('shelljs');
var colors = require('colors');
var path = require('path'); 
var fsP = require('promisify-fs');
var fs = require('fs');
//Variable 
var olddir;
var nameS;
var number =1;
var hashToRevert=0;
var hash = shell.exec('git log | head -n 1 | cut -c8-47', {silent:true});


let Dname = shell.exec('pwd | sed \'s#.*/##\'', { silent: true }).replace('\n', '').replace('\r', '');
const GIT = 'git@github.com:TRIPTYK';
let config;

let init = async ()=>{
     try{
        let configExists =  await fsP.fileExists(''+process.cwd()+'/config2.js') 
        let exist = (configExists !== null) ?  true : false;
        
        console.log('file exists ? ' + exist);
        if (exist == false){
            console.log('Le fichier n\'existe pas nous allons le créer ensemble');
            let logger =  fs.createWriteStream("/home/christopher/ScriptNode/config2.js");
            prompt.start();
            const {host} = await prompt.get(["host"]);
            console.log(`  host: ${host},`);
            logger.write('var config = {};\n');
            logger.write('config.host="' + `${host}` + '";\n');
            console.log('Le nom de votre projet est : '+Dname+' (y or n)?');
            const {res} = await prompt.get(["res"]);
            if (res=="y"){
                console.log('Oui c\'est le bon nom');
                logger.write('config.name="' + Dname + '";\n');
                const {db} = await prompt.get(["db"]);
                logger.write('config.db="' + `${db}` + '";\n');
                const {user} = await prompt.get(["user"]);
                logger.write('config.user="' + `${user}` + '";\n');
                logger.write('module.exports = config;\n');
                config = require("./config2.js");
             sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
            }
            else{
                console.log('Veuillez entrer le nom correcte');
                const {name} = await prompt.get(["name"]);
                logger.write('config.name="' +`${name}` + '";\n');
                const {db} = await prompt.get(["db"]);
                logger.write('config.db="' + `${db}`+ '";\n');
                const {user} = await prompt.get(["user"]);
                logger.write('config.user="' + `${user}` + '";\n');
                logger.write('module.exports = config;\n');
                config = require("./config2.js");
             sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
            }
        }
         else{
             console.log('Le fichier de configuration existe');
             config = require("./config2.js");
             sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
         }
       
     }catch(e){
         console.log(e)
     }
}

let isInstalled = async ()=> {
    await ssh.exec("dpkg -s git | head -2 | echo $?").then((data) => {
        
        console.log('Le paquet git est bien installé'.bgGreen);
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit();
    });


    await ssh.exec("dpkg -s mongodb-org | head -2 | echo $?").then((data) => {
      
      console.log('Le paquet mongoDB est bien installé'.bgGreen);
      
  }).catch((error) => {
      console.log("Error : " + error);
      process.exit();
  });

  await ssh.exec(" pm2 -v | echo $?").then((data) => {
    
    console.log('Le paquet PM2 est bien installé'.bgGreen);

}).catch((error) => {
    console.log("Error : " + error);
    process.exit();
});
}

let pingHost =async () =>{
    var hosts = [config.host];
    try{
        hosts.forEach( function(host){
            ping.promise.probe(config.host).then(function (isAlive){

                        if (isAlive.alive){
                            console.log('Host OK');
                            
                        }
                        else{
                            console.log('Host unreachable');
                            process.exit();
                        }
                        });             
        });
    }
catch(e){
    console.log(e);
}
}

let cloneorrevert = async ()=> {
    try{
        
 //Choix du Clone ou du revert
 console.log('Souhaitez-vous faire un clone ou un revert? (c ou r)');
 prompt.start();
 const {resC} = await prompt.get(["resC"]);
     if (resC == "c") {
         console.log('Vous avez choisi le clone');
         globalClone();
         
     }
     else {
         console.log('Vous avez choisi le revert');
         globalRevert();
     }
    }
    catch(e){
        console.log(e);
    }
}

/*----------------------------------------------------Fonctions utilisées dans la fonction gloable Clone-------------------------------------------------------------------------*/
let testDir = async()=> {
    
    await ssh.exec('mkdir -p /var/www/' + config.name);
    console.log('dossier principale déjà créer');
}

let clone = async()=> {
    
    let data = await ssh.exec('cd /var/www/' + config.name + ' && ls -lt | nl | tail -n 1 | cut -c5-6')
    console.log("Il y a actuellement : " + parseInt(data - 1) + ' sous dossier');
        if (parseInt(data - 1) > 10) {
         await Olddirectory();
        }
        else {
            console.log('Dossier OK');
            await crDir();
        }
}

//Fonction appelée dans clone, elle prend le nom du dossier le plus vieux
let Olddirectory = async ()=> {

    ssh.exec('cd /var/www/' + config.name + ' && ls -tl | tail -n 1 | cut -c42-96').then((olddirl) => {
        console.log('Le vieux dossier est : ' + olddirl);
        olddir = olddirl;
        //RemoveOld();

    }).catch((error) => {
        console.log("Error : " + error);
    });

}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
let RemoveOld = function () {
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
let crDir = async ()=> {
    await ssh.exec(' mkdir -p /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''))
    console.log('dossier creer');

}

let gitclone = async ()=> {
    try{
    await ssh.exec(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''));
    console.log('dossier cloner');
    }
    catch(error){
        console.log(error.toString('utf8'));
        console.log('Le projet est déjà cloner');
        
    }
}

let Db = async () =>{
    console.log('Avez vous une base de données déjà présente sur le serveur de destination?(y or n)');
    prompt.start();
    const {resBd} = await prompt.get(["resBd"]);
     if (resBd == "y") {
        await copieMongoUpdate();
        await countMongoUpdate();
        await recupName();
     }
     else {
        console.log('Non vous en avez pas');
        await MongoDump();
        await MongoRestore();
        await npm();
     }
}

//Copie du dossier mongoUpdate dans le répertoire sur le serveur 
let copieMongoUpdate = async ()=> {
    await shell.exec('scp -r -p ' + process.cwd() + '/mongoUpdate ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''), { silent: true });
    
}

//fonction qui va compter combien de script de MAJ il y a dans mongoUpdate
let countMongoUpdate = async ()=> {
    let data = await ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate && ls -l . | egrep -c \'^-\'')
        console.log('Le nombre de script de MAJ mongo est de ' + data);
        nbreMU = data;
    
}

//Fonction qui travail avec recupName, lorsque le nom est récupéré, il est transmis à cette fonction qui va exécuter le script
let transfert = async () =>{
   let data = await ssh.exec('mongo localhost:27017/' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate/' + nameS)
            console.log('Script transmis et exécuter');
            number++;
            await recupName();
}

//Fonction appelée dans transfert(), elle récupère le nom des scripts dans mongoUpdate 
let recupName = async ()=> {
    if (number>nbreMU){
        await npm();
    }
    if (number <= nbreMU) {
    let data = await ssh.exec('find /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate -maxdepth 1 -type f -printf \'%f\\n\' | awk FNR=='+number+'')
        console.log('le nom du script ' + data);
        nameS = data;
        await transfert();
}
}

let npm = async ()=> {
    try{
        await ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/ && npm install');
        console.log('Paquet npm installer'.bgGreen);
    }
    catch(error){
        console.log(error.toString('utf8'));
        console.log('Paquet NPM déjà installer');
    }
       
   
}

//fonction appelée dans npm() , elle stop tout les processus pm2
let pm2Stop = async () =>{
    try{
        await ssh.exec('pm2 stop ' + config.name)
        console.log('PM2 stopper'.bgGreen);
    }
    
    catch(error){
    console.log(error.toString('utf8'));
    console.log('Il n\'y a pas de porcess déjà actif de ce projet')

      }  
   
}

//fonction appelée dans pm2Stop(), elle supprime le conteneur pm2 portant le nom du projet
let pm2Delete = async ()=> {
    
        try{
            await ssh.exec('pm2 delete ' + config.name)
        console.log('PM2 supprimer'.bgGreen);
        }
        
        catch(error){
            console.log(error.toString('utf8'));
          }  
   
}
/* Attention il faut installer : "npm i -g babel-cli" car pm2 à des soucis de compréhension avec node */
//fonction appelée dans pm2Delete, elle démarre le process grâce au fichier app.js situer dans /app
let pm2Start = async ()=> {
    try {
        //FIXME: Endroit du script app.js
    await ssh.exec('pm2 start /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/test/app/app.js --name=' + config.name)
        console.log('PM2 Démarrer'.bgGreen);
        process.exit();
    }
    catch(error){
        console.log(error.toString('utf8'));
        process.exit();
    }
}

//Fonction apellée dans db(), elle dump la db local en reprenant le nom issu du fichier config.js
let MongoDump = async () =>{
   try{
    await shell.exec('mongodump --db ' + config.db + ' -o /tmp', { silent: true });
        ssh.exec('mkdir /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database');
        console.log('Dossier database créer');
        shell.exec('scp -r -p /tmp/' + config.db + ' ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database', { silent: true });
    
   }
   catch(error){
    console.log('DB Dump');
   }
}

//fonction appelée dans MongoDump(), elle va restore la db sur le serveur
let MongoRestore = async ()=> {
    try{
        await ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/')
        console.log('Mongo Restore effectué');
        shell.exec('rm -rf /tmp/' + config.db, { silent: true });
        
    }
    catch(error){
            console.log('DB restore');
    }
    
}

/* -------------------------------------------------------------------------------Partie Revert----------------------------------------------------------------------------------- */
let revert = async ()=> {
     let data =  await ssh.exec("cd /var/www/" + config.name + " && ls -l | nl");
        console.log('Choisissez la version a revert en fonction des numéros en début de lignes')
        console.log(data);
        prompt.start();
        let {numberR} = await prompt.get(["numberR"]);
            
                number=numberR;
                console.log(number);
}
       
       

let rhash = async ()=> {
    let rhash = await ssh.exec("cd /var/www/" + config.name + " && ls -l | head -n " + number + " | tail -n 1 | cut -c48-88");
        console.log('La version suivantes sera revert :' + rhash);
        hashToRevert = rhash;
}

let Mongodelete = async ()=> {
    await ssh.exec('mongo ' + config.db + ' --eval "db.dropDatabase()"')
        console.log('Ancienne db supprimée');
        
}

let Mongocreate = async ()=> {
    
    try{
        await ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/database/');
        console.log('DB restore');
    }
    catch(error){
        console.error("Db Restore");
    }
}
/*------------------------------------------------------------------------------------Fin partie Revert---------------------

/* --------------------------------Global Clone-------------------------------------*/
let globalClone=async()=>{
    //console.log('je passe dans le clone');
    await testDir();
    await clone();
    await gitclone();
    if (config.db == "") {
       await npm();
       await pm2Stop();
       await pm2Delete();
       await pm2Start();
    }
    else {
       
        await Db();
        await pm2Stop();
        await pm2Delete();
        await pm2Start();
    }
}

//TODO: Essayer dans le revert
/*-----------------------------------------Global Revert-----------------------------------*/
let globalRevert= async()=>{
    await revert();
    await rhash();
    if (config.db == "") {

        await pm2Stop();
        await pm2Delete();
        await pm2Start();
    }
    else {
        await Mongodelete();
        await Mongocreate();
        await pm2Stop();
        await pm2Delete();
        await pm2Start();
    }
}
/*--------------------------------Global Init---------------------------------------*/
let globalInit = async() =>
{
      await init();
      await isInstalled();
      await pingHost();
     setTimeout(cloneorrevert,1000) ;
}

/*---------------------------------Début du script--------------------------------*/
console.log('Bienvenue dans le script de déploiement d\'application node vos êtes dans le dossier local '.bgGreen + __dirname);
globalInit();
