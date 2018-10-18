# ripplet

A simple XRP wallet with deposit and withdrawal notification features

### Quick Start
Create a persistent volume
```
docker volume create --name=ripplet-data
```

Create a xrp.env file and put the following options(required)
```
mkdir -p ~/.ripplet
nano ~/.ripplet/xrp.env
```

Follow the format below for your xrp.env
```
secret=snYourXrpSeed
key=yourpassphrase
notify=https://yourservers-deposit-callback-url/?code=yourownsecretcode
maxfee=0.000012
```

Run the docker image
```
docker run -v ripplet-data:/usr/src/app --name=ripplet-node -d \
      -p 8899:8899 \
      -v $HOME/.ripplet/xrp.env:/usr/src/app/xrp.env \
      -v $HOME/.ripplet/db.json:/usr/src/app/src/db/db.json \
      -v $HOME/.ripplet/logs:/usr/src/app/logs \
      unibtc/ripplet:latest
```

Check Logs to view your withdrawal url
```
docker logs ripplet
```

Check log files at `$HOME/.ripplet/logs`

Auto Installation
```
sudo bash -c "$(curl -L https://git.io/fxauA)"
```