import React from 'react';

import { Link } from 'react-router-dom';

import './styled.css';

function Home() {
    return (
        <>
        <h1>Hello World!</h1>

        <Link to='/videoconf'>
        Videoconferência
        </Link>
        </>
    );
}

export default Home;
