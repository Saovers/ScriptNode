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
//FIXME: Decommanter la ligne du bon git
//const GIT = 'https://github.com/Saovers';
const GIT = 'git@github.com:TRIPTYK';
let config;

let init = async ()=>{
     try{
        let configExists =  await fsP.fileExists(''+process.cwd()+'/config.js') 
        let exist = (configExists !== null) ?  true : false;
        
        console.log('file exists ? ' + exist);
        if (exist == false){
            console.log('Le fichier n\'existe pas nous allons le créer ensemble');
            let logger =  fs.createWriteStream(''+process.cwd()+'/config.js');
            prompt.start();
            const {host} = await prompt.get(["host"]);
            
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
                fs.appendFileSync(''+process.cwd()+'/config.js', 'module.exports = config;\n');
                config = require("./config.js");
             sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
        process.exit();
            }
            else{
                console.log('Veuillez entrer le nom correcte');
                const {name} = await prompt.get(["name"]);
                logger.write('config.name="' +`${name}` + '";\n');
                const {db} = await prompt.get(["db"]);
                logger.write('config.db="' + `${db}`+ '";\n');
                const {user} = await prompt.get(["user"]);
                logger.write('config.user="' + `${user}` + '";\n');
                fs.appendFileSync(''+process.cwd()+'/config.js', 'module.exports = config;\n');
                config = require("./config.js");
             sshconfig = {
            host: config.host,
            username: config.user,
            //FIXME: Voir la méthode soit password en clair soit chemin vers la clef
            identity: '/home/christopher/.ssh/id_rsa'
        }
        ssh = new SSH2Promise(sshconfig);
        process.exit();
            }
        }
         else{
             console.log('Le fichier de configuration existe');
             config = require("./config.js");
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
    console.log('Le dossier /var/www/'+config.name+' existe déjà');
}

let clone = async()=> {
    
    let data = await ssh.exec('cd /var/www/' + config.name + ' && ls -lt | nl | tail -n 1 | cut -c5-6')
    console.log("Il y a actuellement : " + parseInt(data - 1) + ' sous dossier');
        if (parseInt(data - 1) > 10) {
         await Olddirectory();
        }
        else {
            console.log('Pas de suppression nécessaire'.bgBlue);
            //await crDir();
        }
}

//Fonction appelée dans clone, elle prend le nom du dossier le plus vieux
let Olddirectory = async ()=> {

    let olddirl = await ssh.exec('cd /var/www/' + config.name + ' && ls -tl | tail -n 1 | cut -c42-96')
    
        console.log('Le dossier le plus vieux est : ' + olddirl);
        olddir = olddirl;
        await RemoveOld();

}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
let RemoveOld = async ()=> {
    if (olddir==""){
        console.log('La variable olddir est vide, attention cela risque de supprimer tous vos dossiers, vérifier dans le code le soucis');
        //await crDir();
    }
    else{
        console.log(olddir);
        try{
            console.log(' rm -rd /var/www/' + config.name + '/' + olddir);
            
            await ssh.exec(' rm -rd /var/www/' + config.name + '/' + olddir)
            console.log('dossier supprimer');
        }
       catch(error){
           console.log(error.toString('utf8'));
           
       }
        //await crDir();
    }
   
}

//Fonction appelée dans RemoveOld, elle crée le dossier qui acceuillera le projet sous ce format : /var/www/NameProject/Hash/DirProject
let crDir = async ()=> {
    await ssh.exec(' mkdir -p /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''))
    console.log('Création du répertoire : '+hash.replace('\n', '').replace('\r', ''));

}

let gitclone = async ()=> {
    try{
        console.log(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''));
     await ssh.exec(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''));
    console.log('dossier cloner');
    }
    catch(error){
        console.log(error.toString('utf8'));
        //console.log('Le projet est déjà cloner'.bgBlue);
        
    }
}

/*let compareHash = async()=>{
    let tHash = await ssh.exec(' cd /var/www/'+config.name+'/'+hash+' | git log | head -n 1 | cut -c8-47');
    if (tHash==hash){
        console.log('Le deux hash on la même valeur');
    }
    else{
        console.log('Les deux hash sont différent, veuillez commit vos dernier changement pour continuer');
    }
}
*/
let Db = async () =>{
    console.log('Avez vous une base de données déjà présente sur le serveur de destination?(y or n)');
    prompt.start();
    const {resBd} = await prompt.get(["resBd"]);
     if (resBd == "y") {
         console.log('Copie du dossier mongoUpdate');
        await copieMongoUpdate();
        await countMongoUpdate();
        await recupName();
     }
     else {
        console.log('Importation de la base de donnée :'+config.db);
        await MongoDump();
        await MongoRestore();
        await npm();
     }
}

//Copie du dossier mongoUpdate dans le répertoire sur le serveur 
let copieMongoUpdate = async ()=> {
    try{
        await shell.exec('scp -r -p ' + process.cwd() + '/mongoUpdate ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''), { silent: true });

    }
    catch(error){
        console.log('Le dossier mongoUpdate existe déjà et les scripts sont déjà transferer');
        
    }
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
        console.log('Paquets npm installés'.bgGreen);
    }
    catch(error){
        console.log(error.toString('utf8'));
        console.log('Paquets NPM déjà installés'.bgBlue);
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
    console.log('Il n\'y a pas de process actif pour ce projet'.bgRed);

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
            console.log('Il n\'y a pas de process supprimable pour ce projet'.bgRed)
          }  
   
}
/* Attention il faut installer : "npm i -g babel-cli" car pm2 à des soucis de compréhension avec node */
//fonction appelée dans pm2Delete, elle démarre le process grâce au fichier app.js situer dans /app
let pm2Start = async ()=> {
    try {
    await ssh.exec('pm2 start /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/app.js --name=' + config.name)
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
   
    shell.exec('mongodump --db ' + config.db + ' -o /tmp', { silent: true });
    try{
        await ssh.exec('mkdir /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/'+config.db);
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
        await ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/'+config.db);
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
    let rhash = await ssh.exec("cd /var/www/" + config.name + " && ls -l | head -n " + number + " | tail -n 1 | cut -c42-88");
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
let pm2StartR = async ()=> {
    try {
        //FIXME: Endroit du script app.js
    await ssh.exec('pm2 start /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/app.js --name=' + config.name)
        console.log('PM2 Démarrer'.bgGreen);
        process.exit();
    }
    catch(error){
        console.log(error.toString('utf8'));
        process.exit();
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
        await pm2StartR();
    }
    else {
        await Mongodelete();
        await Mongocreate();
        await pm2Stop();
        await pm2Delete();
        await pm2StartR();
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
