import { StylesInitializer } from './initializers/StylesInitializer';
import { ReflectInitializer } from './initializers/ReflectInitializer';

import { IContext, IContextConstructor } from './interfaces/contexts/IContext';
import { IComponentContext, IComponentContextConstructor } from './interfaces/contexts/IComponentContext';
import { IAspectContext, IAspectContextConstructor } from './interfaces/contexts/IAspectContext';
import { ITransformerContext, ITransformerContextConstructor } from './interfaces/contexts/ITransformerContext';
import { IEntityDependencyConstructor } from './interfaces/IEntityDependencyConstructor';
import { IInjectable, IInjectableConstructor } from './interfaces/IInjectable';

import { IGlobalConfig } from './interfaces/IGlobalConfig';
import { IContextConfig } from './interfaces/contexts/configs/IContextConfig';
import { IComponentContextConfig } from './interfaces/contexts/configs/IComponentContextConfig';
import { IContextWithEvents } from './interfaces/contexts/IContextWithEvents';

import { IShadowRootConfig } from './interfaces/IShadowRootConfig'; 
import { ITemplateProvider } from './interfaces/ITemplateProvider';

import { AppRoot, Container, Component, Aspect, Transformer, Injectable, Detector, Eventer,
         $Template, $AdoptedStyle, $Injectable, $Config, $Route } from './Decorators';

import { ChangeDetector } from './models/injections/ChangeDetector';
import { ElementManipulations } from './models/injections/ElementManipulations';
import { ElementSubscriptions } from './models/injections/ElementSubscriptions';
import { EventDispatcher } from './models/injections/EventDispatcher';

import { Router } from './Router';
import { CallBackEvent } from './CallBackEvent';

import { Helpers } from './Helpers';

StylesInitializer.init();
ReflectInitializer.init();

export {
    AppRoot,
    Container,
    Component,
    Aspect,
    Transformer,
    Injectable,
    Detector,
    Eventer,

    $Template,
    $AdoptedStyle,
    $Injectable,
    $Config,
    $Route,

    IContext, IContextConstructor,
    IComponentContext, IComponentContextConstructor,
    IAspectContext, IAspectContextConstructor,
    ITransformerContext, ITransformerContextConstructor,
    IInjectable, IInjectableConstructor,
    IContextWithEvents,
    IEntityDependencyConstructor,

    IGlobalConfig,
    IContextConfig,
    IComponentContextConfig,
    IShadowRootConfig,
    ITemplateProvider,

    ChangeDetector,
    ElementManipulations,
    ElementSubscriptions,
    EventDispatcher,

    Router,
    CallBackEvent,
    Helpers
};