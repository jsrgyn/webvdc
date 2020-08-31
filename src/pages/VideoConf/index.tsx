import React from 'react';

import { Link } from 'react-router-dom';

import Conference from '../../components/Conference';

import './styled.css';

function VideoConf() {
    return (
        <>
        <h1>Videoconferência</h1>

        <Conference />


        <Link to='/'>Home</Link>
        </>
    );
}

export default VideoConf;
