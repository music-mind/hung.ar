import React, { Component } from 'react';
import { AppRegistry, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, Permissions, FaceDetector } from 'expo';
import { Button, Image, Linking } from 'react-native';
import { email, ACCESS_TOKEN, ACCESS_ID, REG_ID } from './config.js';

export default class App extends Component {
  state = {
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
    hasFood: false,
    data: {},
    stage: 0,
    hasPaid: false,
    notified: false,
    referenceNumber: "",
    requestID: "",
  };

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  uuid = () => {
    let dt = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
  }

  buyFood = () => {
    if (!this.state.notified) {
      let uuid = this.uuid();
      fetch('https://gateway-web.beta.interac.ca/publicapi/api/v2/money-requests/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'accessToken': "Bearer " + ACCESS_TOKEN,
          'thirdPartyAccessId': ACCESS_ID,
          'requestId': uuid,
          'deviceId': uuid,
          'apiRegistrationId': REG_ID
        },
        body: JSON.stringify({
          "sourceMoneyRequestId": Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5),
          "requestedFrom": {
            "contactId": "CAsyJjfTFfMn",
            "contactHash": "fd805650e4295158450591b511c8cdeb",
            "contactName": "Arri Ye",
            "language": "en",
            "notificationPreferences": [
              {
                "handle": email,
                "handleType": "email",
                "active": true
              }
            ]
          },
          "amount": this.state.data.price || 10,
          "currency": "CAD",
          "editableFulfillAmount": false,
          "requesterMessage": "Fill Up Your Wallet to Enjoy Some Food :)",
          "invoice": {
            "invoiceNumber": "123",
            "dueDate": "2019-02-19T04:59:59.760Z"
          },
          "expiryDate": "2019-02-19T04:59:59.760Z",
          "supressResponderNotifications": true,
          "returnURL": "string"
        }),
      })
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        this.setState({
          ...this.state,
          referenceNumber: responseJson.referenceNumber,
          requestID: uuid,
          notified: true
        });
        Linking.openURL(responseJson.paymentGatewayUrl);
      })
      .catch((error) => {
        console.error(error);
      });
    } else if (!this.state.hasPaid) {
      fetch('https://gateway-web.beta.interac.ca/publicapi/api/v2/money-requests/send?fromDate=2019-01-19T20:37:58.674Z&toDate=2019-06-19T06:59:36.252Z', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'accessToken': "Bearer " + ACCESS_TOKEN,
          'thirdPartyAccessId': ACCESS_ID,
          'requestId': this.state.uuid,
          'deviceId': this.state.uuid,
          'apiRegistrationId': REG_ID
        },
      })
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        if (responseJson[0].status == 8) {
          this.setState({
            ...this.state,
            hasPaid: true
          });
          this.loadFood();
        }
      })
      .catch((error) => {
        console.error(error);
      });
    } else {
      this.loadFood();
    }
    return;
  }

  loadFood = () => {
    fetch('https://music-mind.lib.id/food@dev/')
      .then((response) => response.json())
      .then((responseJson) => {
        console.log(responseJson);
        this.setState({
          ...this.state,
          data: responseJson,
          hasFood: true,
          stage: 0,
        });
      })
      .catch((error) => {
        console.error(error);
      });
      return;
  }

  eatFood = () => {
    const { stage } = this.state;
    if (stage <= 1) {
      this.setState({
        ...this.state,
        stage: stage + 1
      });
    } else if (stage == 2) {
      this.setState({
        ...this.state,
        hasFood: false
      })
    }
    return;
  }

  handleFacesDetected = (data) => {
    console.log(data);
    if (data.faces.length && data.faces[0].smilingProbability && data.faces[0].smilingProbability > 0.08) {
      this.eatFood();
    }
  }

  render() {
    const { hasCameraPermission, hasFood, data, stage } = this.state;

    let centerItem = hasFood ? <TouchableOpacity onPress={this.eatFood}><Image source={{uri: data.src[stage]}} style={{ width: 600, height: 600 }} /></TouchableOpacity> : <View />;

    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={{ flex: 1 }}>
          <Camera style={{ flex: 1, justifyContent: 'flex-start'}} type={this.state.type} onFacesDetected={this.handleFacesDetected}
            faceDetectorSettings={{
              mode: FaceDetector.Constants.Mode.fast,
              detectLandmarks: FaceDetector.Constants.Landmarks.none,
              runClassifications: FaceDetector.Constants.Classifications.all,
            }}>
            <View style={{top: 50, right: -100, position: 'absolute', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center'}} >{centerItem}</View>
              <TouchableOpacity style={{top: 25, left: 175, backgroundColor: 'transparent'}}>
                <Text style={{fontSize: 18, color: 'white'}}>{"Hung.ar"}</Text>
              </TouchableOpacity>
            <View
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                  margin: 10
                }}
                onPress={() => {
                  this.setState({
                    type: this.state.type === Camera.Constants.Type.back
                      ? Camera.Constants.Type.front
                      : Camera.Constants.Type.back,
                  });
                }}>
                <Text
                  style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
                  {' '}Flip{' '}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                  margin: 10
                }}
                onPress={this.buyFood}>
                <Text
                  style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
                  {' '}Buy{' '}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                  margin: 10
                }}
                onPress={this.eatFood}>
                <Text
                  style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
                  {' '}Eat{' '}
                </Text>
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      );
    }
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
});

AppRegistry.registerComponent('App', () => App)
