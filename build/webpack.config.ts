import webpack from 'webpack'
import path from 'path'

const webpackConfig:webpack.ConfigurationFactory=(env)=>{

   let mode:'production'|'development'=(env as any).production?'production':'development'
    return {
        mode,
        entry:path.resolve(__dirname,'../packages/seed/index.ts'),
        output:{
            path:path.resolve(__dirname,'../build-dist'),
            filename:'seed.js'
        },
        resolve:{
            extensions:['.ts','.js','.json']
        },
        devtool:'#inline-source-map',
        module:{
            rules:[
                {
                    test:/\.tsx?$/,
                    use:'ts-loader',
                    exclude:/node_modules/
                }
            ]
        }
    }
}

export default webpackConfig;
