import React, { Component }  from 'react';

import io from 'socket.io-client'
import { Socket } from 'dgram';

declare global {
    interface Window { localStream: any; }
}

export default class Conference extends React.Component {

  private socket: SocketIOClient.Socket = {} as SocketIOClient.Socket;
  private serviceIP: string = 'https://f1c942785e48.ngrok.io/webrtcPeer' as string;


    getLocalStream = () => {
        // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
        const success = (stream: any) => {
            window.localStream = stream;

          this.setState({
            localStream: stream
          })
    
          this.whoisOnline()
        }

        const failure = (e: any) => {
          console.log('getUserMedia Error: ', e)
        }
    
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        const constraints = {
          audio: true,
          video: true,
          options: {
            mirror: true,
          }
        }
    
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        navigator.mediaDevices.getUserMedia(constraints)
          .then(success)
          .catch(failure)
      };

      whoisOnline = () => {
        // let all peers know I am joining
        this.sendToPeer('onlinePeers', null, {local: this.socket.id})
      }

      sendToPeer = (messageType: any, payload: any, socketID: any) => {
        this.socket.emit(messageType, {
          socketID,
          payload
        })
      }

      componentDidMount = () => {

        this.socket = io.connect(
          this.serviceIP,
          {
            path: '/io/webrtc',
            query: {
              room: window.location.pathname,
            }
          }
        )
    
        this.socket.on('connection-success', data: any => {
    
          this.getLocalStream()
    
          // console.log(data.success)
          const status = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
    
          this.setState({
            status: status,
            messages: data.messages
          })
        })
    
        this.socket.on('joined-peers', data => {
    
          this.setState({
            status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
          })
        })
    
        // ************************************* //
        // ************************************* //
        this.socket.on('peer-disconnected', data => {
    
          // close peer-connection with this peer
          this.state.peerConnections[data.socketID].close()
    
          // get and stop remote audio and video tracks of the disconnected peer
          const rVideo = this.state.remoteStreams.filter(stream => stream.id === data.socketID)
          rVideo && this.stopTracks(rVideo[0].stream)
    
          // filter out the disconnected peer stream
          const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID)
    
          this.setState(prevState => {
            // check if disconnected peer is the selected video and if there still connected peers, then select the first
            const selectedVideo = prevState.selectedVideo.id === data.socketID && remoteStreams.length ? { selectedVideo: remoteStreams[0] } : null
    
            return {
              // remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
              remoteStreams,
              ...selectedVideo,
              status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
            }
            }
          )
        })
    
        // this.socket.on('offerOrAnswer', (sdp) => {
    
        //   this.textref.value = JSON.stringify(sdp)
    
        //   // set sdp as remote description
        //   this.pc.setRemoteDescription(new RTCSessionDescription(sdp))
        // })
    
        this.socket.on('online-peer', socketID => {
          // console.log('connected peers ...', socketID)
    
          // create and send offer to the peer (data.socketID)
          // 1. Create new pc
          this.createPeerConnection(socketID, pc => {
            // 2. Create Offer
            if (pc) {
          
              // Send Channel
              const handleSendChannelStatusChange = (event) => {
                console.log('send channel status: ' + this.state.sendChannels[0].readyState)
              }
    
              const sendChannel = pc.createDataChannel('sendChannel')
              sendChannel.onopen = handleSendChannelStatusChange
              sendChannel.onclose = handleSendChannelStatusChange
            
              this.setState(prevState => {
                return {
                  sendChannels: [...prevState.sendChannels, sendChannel]
                }
              })
    
    
              // Receive Channels
              const handleReceiveMessage = (event) => {
                const message = JSON.parse(event.data)
                // console.log(message)
                this.setState(prevState => {
                  return {
                    messages: [...prevState.messages, message]
                  }
                })
              }
    
              const handleReceiveChannelStatusChange = (event) => {
                if (this.receiveChannel) {
                  console.log("receive channel's status has changed to " + this.receiveChannel.readyState);
                }
              }
    
              const receiveChannelCallback = (event) => {
                const receiveChannel = event.channel
                receiveChannel.onmessage = handleReceiveMessage
                receiveChannel.onopen = handleReceiveChannelStatusChange
                receiveChannel.onclose = handleReceiveChannelStatusChange
              }
    
              pc.ondatachannel = receiveChannelCallback
    
    
              pc.createOffer(this.state.sdpConstraints)
                .then(sdp => {
                  pc.setLocalDescription(sdp)
    
                  this.sendToPeer('offer', sdp, {
                    local: this.socket.id,
                    remote: socketID
                  })
                })
            }
          })
        })
    
        this.socket.on('offer', data => {
          this.createPeerConnection(data.socketID, pc => {
            pc.addStream(this.state.localStream)
    
            // Send Channel
            const handleSendChannelStatusChange = (event) => {
              console.log('send channel status: ' + this.state.sendChannels[0].readyState)
            }
    
            const sendChannel = pc.createDataChannel('sendChannel')
            sendChannel.onopen = handleSendChannelStatusChange
            sendChannel.onclose = handleSendChannelStatusChange
            
            this.setState(prevState => {
              return {
                sendChannels: [...prevState.sendChannels, sendChannel]
              }
            })
    
            // Receive Channels
            const handleReceiveMessage = (event) => {
              const message = JSON.parse(event.data)
              // console.log(message)
              this.setState(prevState => {
                return {
                  messages: [...prevState.messages, message]
                }
              })
            }
    
            const handleReceiveChannelStatusChange = (event) => {
              if (this.receiveChannel) {
                console.log("receive channel's status has changed to " + this.receiveChannel.readyState);
              }
            }
    
            const receiveChannelCallback = (event) => {
              const receiveChannel = event.channel
              receiveChannel.onmessage = handleReceiveMessage
              receiveChannel.onopen = handleReceiveChannelStatusChange
              receiveChannel.onclose = handleReceiveChannelStatusChange
            }
    
            pc.ondatachannel = receiveChannelCallback
    
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
              // 2. Create Answer
              pc.createAnswer(this.state.sdpConstraints)
                .then(sdp => {
                  pc.setLocalDescription(sdp)
    
                  this.sendToPeer('answer', sdp, {
                    local: this.socket.id,
                    remote: data.socketID
                  })
                })
            })
          })
        })
    
        this.socket.on('answer', data => {
          // get remote's peerConnection
          const pc = this.state.peerConnections[data.socketID]
          // console.log(data.sdp)
          pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{})
        })
    
        this.socket.on('candidate', (data) => {
          // get remote's peerConnection
          const pc = this.state.peerConnections[data.socketID]
    
          if (pc)
            pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        })
      }

    render() {
        return (
            <>
              <h1>Conference</h1>
              <h2>Hello Horld</h2>
            </>
        )
    }
};