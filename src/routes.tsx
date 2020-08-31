import React from 'react';

import { BrowserRouter, Route } from 'react-router-dom';

import Home from './pages/Home';
import VideoConf from './pages/VideoConf'

function Routes() {
    return (
        <BrowserRouter>
            <Route path="/" exact component={Home} />
            <Route path="/videoconf" component={VideoConf} />
        </BrowserRouter>
    )
}

export default Routes;