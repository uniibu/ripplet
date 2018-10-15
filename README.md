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
ip_lock=127.0.0.1,localhost
key=yourpassphrase
notify=https://yourservers-deposit-callback-url/?code=yourownsecretcode
```

Run the docker image
```
docker run -v ripplet-data:/usr/src/app --name=ripplet -d \
      -p 8899:8899 \
      -v $HOME/.ripplet/xrp.env:/usr/src/app/xrp.env \
      unibtc/ripplet:latest
```

Check Logs to view your withdrawal url
```
docker logs ripplet
```

Auto Installation
```
sudo bash -c "$(curl -L https://git.io/fx0z4)"
```